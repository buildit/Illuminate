// Staging release pipeline
@Library('buildit')
def LOADED = true

node {
  withEnv(["PATH+NODE=${tool name: 'latest', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
    currentBuild.result = "SUCCESS"
    sendNotifications = !env.DEV_MODE

    try {
      stage ('Set Up') {
        // clean the workspace before checking out
        if(fileExists('.git')) {
          echo 'Perform workspace cleanup'
          sh "git clean -ffdx"
        }

        if (env.USE_GLOBAL_LIB) {
          ecrInst = new ecr()
          gitInst = new git()
          npmInst = new npm()
          slackInst = new slack()
          convoxInst = new convox()
          templateInst = new template()
        } else {
          sh "curl -L https://dl.bintray.com/buildit/maven/jenkins-pipeline-libraries-${env.PIPELINE_LIBS_VERSION}.zip -o lib.zip && echo 'A' | unzip -o lib.zip"
          ecrInst = load "lib/ecr.groovy"
          gitInst = load "lib/git.groovy"
          npmInst = load "lib/npm.groovy"
          slackInst = load "lib/slack.groovy"
          convoxInst = load "lib/convox.groovy"
          templateInst = load "lib/template.groovy"
        }

        domainName = "${env.MONGO_HOSTNAME}".substring(8)
        registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
        registry = "https://${registryBase}"
        appName = "illuminate"
        mongoUrl = "mongodb://${env.MONGO_HOSTNAME}:27017"
        serverUrl = "${appName}.staging.${domainName}"
        serverPort = "80"
        dbContext = "staging"

        // global for exception handling
        slackChannel = "synapse"
        gitUrl = "https://bitbucket.org/digitalrigbitbucketteam/${appName}"
        appUrl = "http://${appName}.staging.${domainName}"
      }


      stage ('Checkout') {
        checkout scm

        // global for exception handling
        shortCommitHash = git.getShortCommit()
        commitMessage = git.getCommitMessage()
        version = npm.getVersion()
      }

      stage ('Install') {
        sh "rm -rf node_modules"
        sh "npm install"
      }

      stage ('Validation') {
        sh "NODE_ENV='validation' DB_URL='${mongoUrl}' CONTEXT='validation' SERVER_URL='${serverUrl}' SERVER_PORT='${serverPort}' LOG_LEVEL='DEBUG' npm run genConfig"
        sh "NODE_ENV='validation' npm run validate"
      }

      stage ('Packaging') {
        sh "NODE_ENV='development' npm prune"
        sh "NODE_ENV='development' npm shrinkwrap"
        sh "NODE_ENV='staging' VERSION='${version}' DB_URL='${mongoUrl}' SERVER_URL='${serverUrl}' SERVER_PORT='${serverPort}' LOG_LEVEL='INFO' npm run package"
        sh "cd dist; npm install --production"
      }

      stage ('Docker Image Build') {
        tag = "${version}-${shortCommitHash}-${env.BUILD_NUMBER}"
        image = docker.build("${appName}:${tag}", '.')
        ecr.authenticate(env.AWS_REGION)
      }

      stage ('Docker Push') {
        docker.withRegistry(registry) {
          image.push("${tag}")
        }
      }

      stage ('Deploy To AWS') {
        tmpFile = UUID.randomUUID().toString() + ".tmp"
        ymlData = template.transform(readFile("docker-compose.yml.template"), [tag: tag, registry_base: registryBase, mongo_url: mongoUrl, db_context: dbContext, server_url: serverUrl, server_port: serverPort])
        writeFile(file: tmpFile, text: ymlData)

        sh "convox login ${env.CONVOX_RACKNAME} --password ${env.CONVOX_PASSWORD}"
        sh "convox env set NODE_ENV=staging --app ${appName}-staging"
        sh "convox deploy --app ${appName}-staging --description '${tag}' --file ${tmpFile} --wait"
      }

      stage ('Run Functional Acceptance Tests') {
        // wait until the app is deployed
        convox.waitUntilDeployed("${appName}-staging")
        convox.ensureSecurityGroupSet("${appName}-staging", env.CONVOX_SECURITYGROUP)
        sh "NODE_ENV='acceptance' npm run accept"
      }

      stage ('Promote Build to latest') {
        docker.withRegistry(registry) {
          image.push("latest")
        }
        slack.notify("Deployed to Staging", "Commit <${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}> has been deployed to <${appUrl}|${appUrl}>\n\n${commitMessage}", "good", "http://i3.kym-cdn.com/entries/icons/original/000/006/536/illuminati-conspiracy.jpg", slackChannel)
      }
    }
    catch (err) {
      currentBuild.result = "FAILURE"
      slack.notify("Error while deploying to Staging", "Commit <${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}> failed to deploy to <${appUrl}|${appUrl}>", "danger", "http://i3.kym-cdn.com/entries/icons/original/000/004/240/CandleCove.jpg", slackChannel)
      throw err
    }
  }
}
