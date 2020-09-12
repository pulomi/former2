/* ========================================================================== */
// Single Sign-On
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity, &amp; Compliance',
    'service': 'Single Sign-On',
    'resourcetypes': {
        'Permission Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'description',
                        title: 'Description',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Assignments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Principal ID',
                        field: 'principalid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'targetid',
                        title: 'Target ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'permissionsetarn',
                        title: 'Permission Set ARN',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'instancearn',
                        title: 'Instance ARN',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceSingleSignOn() {
    blockUI('#section-securityidentityandcompliance-singlesignon-permissionsets-datatable');
    blockUI('#section-securityidentityandcompliance-singlesignon-assignments-datatable');

    await sdkcall("SSOAdmin", "listInstances", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-singlesignon-permissionsets-datatable').deferredBootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-singlesignon-assignments-datatable').deferredBootstrapTable('removeAll');

        await Promise.all(data.Instances.map(async (instance) => {
            return sdkcall("SSOAdmin", "listPermissionSets", {
                InstanceArn: instance.InstanceArn
            }, true).then(async (data) => {
                await Promise.all(data.PermissionSets.map(async (permissionSet) => {
                    await sdkcall("SSOAdmin", "describePermissionSet", {
                        InstanceArn: instance.InstanceArn,
                        PermissionSetArn: permissionSet
                    }, true).then(async (data) => {
                        data.PermissionSet['InstanceArn'] = instance.InstanceArn;

                        await sdkcall("SSOAdmin", "getInlinePolicyForPermissionSet", {
                            InstanceArn: instance.InstanceArn,
                            PermissionSetArn: permissionSet
                        }, true).then(async (inlinepolicy) => {
                            data.PermissionSet['InlinePolicy'] = inlinepolicy.InlinePolicy;
                        }).catch(() => { });

                        await sdkcall("SSOAdmin", "listManagedPoliciesInPermissionSet", {
                            InstanceArn: instance.InstanceArn,
                            PermissionSetArn: permissionSet
                        }, true).then(async (managedpolicies) => {
                            data.PermissionSet['ManagedPolicies'] = managedpolicies.AttachedManagedPolicies;
                        }).catch(() => { });

                        $('#section-securityidentityandcompliance-singlesignon-permissionsets-datatable').deferredBootstrapTable('append', [{
                            f2id: data.PermissionSet.PermissionSetArn,
                            f2type: 'singlesignon.permissionset',
                            f2data: data.PermissionSet,
                            f2region: region,
                            name: data.PermissionSet.Name,
                            description: data.PermissionSet.Description
                        }]);
                    });

                    return sdkcall("SSOAdmin", "listAccountsForProvisionedPermissionSet", {
                        InstanceArn: instance.InstanceArn,
                        PermissionSetArn: permissionSet
                    }, true).then(async (accountids) => {
                        
                        await Promise.all(accountids.AccountIds.map(async (accountid) => {
                            return sdkcall("SSOAdmin", "listAccountAssignments", {
                                InstanceArn: instance.InstanceArn,
                                PermissionSetArn: permissionSet,
                                AccountId: accountid
                            }, true).then(async (assignments) => {
                                assignments.AccountAssignments.forEach(assignment => {
                                    assignmment['InstanceArn'] = instance.InstanceArn;

                                    $('#section-securityidentityandcompliance-singlesignon-assignments-datatable').deferredBootstrapTable('append', [{
                                        f2id: assignmment.AccountId + " " + assignmment.PermissionSetArn + " " + assignmment.PrincipalId + " assignment for " + instance.InstanceArn,
                                        f2type: 'singlesignon.assignment',
                                        f2data: assignmment,
                                        f2region: region,
                                        principalid: assignmment.PrincipalId,
                                        targetid: assignmment.AccountId,
                                        permissionsetarn: assignmment.PermissionSetArn,
                                        instancearn: instance.InstanceArn
                                    }]);
                                });
                            }).catch(() => { });
                        }));
                    }).catch(() => { });
                }));
            });
        }));
    }).catch(() => { });

    unblockUI('#section-securityidentityandcompliance-singlesignon-permissionsets-datatable');
    unblockUI('#section-securityidentityandcompliance-singlesignon-assignments-datatable');
}

service_mapping_functions.push(function(reqParams, obj, tracked_resources){
    if (obj.type == "singlesignon.permissionset") {
        reqParams.cfn['Name'] = obj.data.Name;
        reqParams.cfn['Description'] = obj.data.Description;
        reqParams.cfn['SessionDuration'] = obj.data.SessionDuration;
        reqParams.cfn['RelayStateType'] = obj.data.RelayState;
        reqParams.cfn['InstanceArn'] = obj.data.InstanceArn;
        reqParams.cfn['InlinePolicy'] = obj.data.InlinePolicy;
        if (obj.data.ManagedPolicies) {
            reqParams.cfn['ManagedPolicies'] = [];

            obj.data.ManagedPolicies.forEach(managedpolicy => {
                reqParams.cfn['ManagedPolicies'].push(managedpolicy.Arn);
            });
        }

        /*
        TODO:
        Tags: 
            - Tag
        */

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('singlesignon', obj.id, 'AWS::SSO::PermissionSet'),
            'region': obj.region,
            'service': 'singlesignon',
            'type': 'AWS::SSO::PermissionSet',
            'options': reqParams,
            'returnValues': {
                'GetAtt': {
                    'PermissionSetArn': obj.data.PermissionSetArn
                }
            }
        });
    } else if (obj.type == "singlesignon.assignment") {
        reqParams.cfn['InstanceArn'] = obj.data.InstanceArn;
        reqParams.cfn['PermissionSetArn'] = obj.data.PermissionSetArn;
        reqParams.cfn['PrincipalId'] = obj.data.PrincipalId;
        reqParams.cfn['PrincipalType'] = obj.data.PrincipalType;
        reqParams.cfn['TargetId'] = obj.data.AccountId;
        reqParams.cfn['TargetType'] = "AWS_ACCOUNT";

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('singlesignon', obj.id, 'AWS::SSO::Assignment'),
            'region': obj.region,
            'service': 'singlesignon',
            'type': 'AWS::SSO::Assignment',
            'options': reqParams
        });
    } else {
        return false;
    }

    return true;
});
