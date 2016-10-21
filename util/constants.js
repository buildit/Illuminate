'use strict'

exportConstant('PROJECTCOLLECTION', 'project');
exportConstant('EVENTCOLLECTION', 'loadEvents');

exportConstant('SUCCESSEVENT', 'COMPLETED SUCCESSFULLY');
exportConstant('FAILEDEVENT', 'FAILED');
exportConstant('PENDINGEVENT', 'PENDING');

exportConstant('DEMANDSECTION', 'demand');
exportConstant('DEFECTSECTION', 'defect');
exportConstant('EFFORTSECTION', 'effort');

exportConstant('LOADEVENT', 'LOAD');
exportConstant('UPDATEEVENT', 'UPDATE');

exportConstant('RAWEFFORT', 'rawEffort');
exportConstant('COMMONEFFORT', 'commonEffort');
exportConstant('SUMMARYEFFORT', 'dailyEffortSummary');

exportConstant('RAWDEMAND', 'rawDemand');
exportConstant('COMMONDEMAND', 'commonDemand');
exportConstant('SUMMARYDEMAND', 'dailyDemandSummary');

exportConstant('DEFAULTSTARTDATE', '2000-01-01+00:00');

exportConstant('JIRADEMANDTYPE', 'Story');
exportConstant('JIRADEFECTTYPE', 'Bug');

function exportConstant (name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}
