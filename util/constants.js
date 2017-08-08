'use strict'

exportConstant('DBDATEFORMAT', 'YYYY-MM-DD');

exportConstant('PROJECTCOLLECTION', 'project');
exportConstant('EVENTCOLLECTION', 'loadEvents');
exportConstant('RAGCOLLECTION', 'ragStatuses');

exportConstant('SUCCESSEVENT', 'COMPLETED SUCCESSFULLY');
exportConstant('FAILEDEVENT', 'FAILED');
exportConstant('PENDINGEVENT', 'PENDING');
exportConstant('FORCEDCLOSEDMESSAGE', 'Event forced complete');

exportConstant('DEMANDSECTION', 'demand');
exportConstant('DEFECTSECTION', 'defect');
exportConstant('EFFORTSECTION', 'effort');

exportConstant('LOADEVENT', 'LOAD');
exportConstant('UPDATEEVENT', 'UPDATE');
exportConstant('REPROCESSEVENT', 'REPROCESS');

exportConstant('RAWEFFORT', 'rawEffort');
exportConstant('COMMONEFFORT', 'commonEffort');
exportConstant('SUMMARYEFFORT', 'dailyEffortSummary');

exportConstant('RAWDEMAND', 'rawDemand');
exportConstant('COMMONDEMAND', 'commonDemand');
exportConstant('SUMMARYDEMAND', 'dailyDemandSummary');

exportConstant('RAWDEFECT', 'rawDefect');
exportConstant('COMMONDEFECT', 'commonDefect');
exportConstant('SUMMARYDEFECT', 'dailyDefectSummary');

exportConstant('DEFAULTSTARTDATE', '2000-01-01');

exportConstant('JIRADEMANDTYPE', 'Story');
exportConstant('JIRADEFECTTYPE', 'Bug');
exportConstant('JIRARELEASEFIELD', 'Fix Version');
exportConstant('JIRACOMPLETE', 'Done');

exportConstant('TRELLODEMANDTYPE', 'Story');
exportConstant('TRELLODEFECTTYPE', 'Bug');
exportConstant('TRELLORELEASEFIELD', 'Fix Version');
exportConstant('JIRACOMPLETE', 'Done');

exportConstant('RAGOK', 'green');
exportConstant('RAGWARNING', 'amber');
exportConstant('RAGERROR', 'red');

exportConstant('DEFAULTDEFECTINITIALSTATE', 'Created');
exportConstant('DEFAULTDEFECTRESOLVEDSTATE', 'Closed');

function exportConstant (name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}
