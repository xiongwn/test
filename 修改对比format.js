const editData = originData.filter(i => i.newData && i.oldData)
console.log("editData", editData)
// 没有修改数据的返回空
if (editData.length === 0) {
    return { record: [] }
}

// 表单字段一维数组
const formFeildNames = formFeilds.map(i => i.name)
// 表单字段map
const formFeildMap = formFeilds.reduce((pre, next) => { pre[next.name] = next.description; return pre }, {})
console.log("formFeilds", formFeilds)
// 表单字段config obj
const formFeildConfig = formFeilds.reduce((pre, next) => { pre[next.name] = next; return pre }, {})
// common ignore field
const commonIgnoreFeildNames = [
    "userId",
    "创建时间",
    "auditor",
    "auditTime",
    "updator",
    "updateTime",
    "forbidTime",
    "forbidUserId",
    "forbidReason",
    "status",
    "approveStatus",
    "flowInstanceId",
    "extra",
    "更新时间",
    "数据ID",
    "提交用户"
]
// formCode to ignore field
const ignoreMap = {
    specification: [
        //"data",
        "extra",
        "standardHeaders",
        "headersGroup"
    ],
    template: [
        "usageOrderNum",
        "usageNum",
        "lastUsageTime",
        "updatorName",
        "slabUserName",
        "slabPrincipalName",
        "slabDepartmentName",
        "userName",
        "sizeRelated",
        "templateCraft",
        "designerUserName"
    ],
    ingredientGroup: [
        //"ingredient"
    ],
    fabric: [
        "categoryName"
    ],
    process: [
        "index"
    ]
}
// 忽略的字段
const ignoreFeildNames = commonIgnoreFeildNames.concat(ignoreMap[formCode])

// 需要展开的对象
const flatObjMap = {
    template: [
        "templateCraft"
    ]
}
for (let i = 0; i < editData.length; i++) {
    let field = editData[i]
    // 把内部对象展开
    if (flatObjMap[formCode] && flatObjMap[formCode].length > 0) {
        let newData = field.newData
        let oldData = field.oldData
        let flatFeildList = flatObjMap[formCode]
        for (let j = 0; j < flatFeildList.length; j++) {
            if (oldData[flatFeildList[j]]) {
                let obj = oldData[flatFeildList[j]]
                if (obj instanceof Array) {
                    obj = obj[0]
                }
                oldData = Object.assign(oldData, obj)
            }
            if (newData[flatFeildList[j]]) {
                let obj = newData[flatFeildList[j]]
                if (obj instanceof Array) {
                    obj = obj[0]
                }
                newData = Object.assign(newData, obj)
            }
        }
    }
}
// 哪些字段需要比对
let comparisonFieldList = editData.map(i => Object.entries(i.newData).concat(Object.entries(i.oldData))).flat().filter(i => !ignoreFeildNames.includes(i[0]) && (typeof i[1] !== "object" || formFeildNames.includes(i[0]))).map(i => i[0])
// 去重
comparisonFieldList = Array.from(new Set(comparisonFieldList))
console.log("comparisonFieldList", comparisonFieldList)

let result = []
// 比对开始
for (let i = 0; i < editData.length; i++) {
    for (let j = 0; j < comparisonFieldList.length; j++) {
        let sentinal = 0

        let newValue = editData[i].newData[comparisonFieldList[j]]
        let oldValue = editData[i].oldData[comparisonFieldList[j]]
        //console.log(formFeildConfig,"formFeildConfig",comparisonFieldList[j])
        const currentConfig = formFeildConfig[comparisonFieldList[j]]
        // 对象数组
        if (currentConfig && currentConfig.type === "table") {
            let field = currentConfig.field
            newValue = newValue?.map(i => field.reduce((pre, next) => { pre[next.name] = i[next.name]; return pre }, {}))
            oldValue = oldValue?.map(i => field.reduce((pre, next) => { pre[next.name] = i[next.name]; return pre }, {}))
        }
        // 一维数组
        if (currentConfig && currentConfig.type === "dataList") {
            newValue = newValue?.map(i => i.split("-").pop() - 0)
            oldValue = oldValue?.map(i => i.split("-").pop() - 0)
        }
        if (!!(newValue || oldValue) && (typeof (newValue || oldValue) !== "object")) {
            if (editData[i].newData[comparisonFieldList[j]] != oldValue) {
                sentinal = 1
            }
        } else if (!!(newValue || oldValue) && !_.isEqual(newValue, oldValue)) {
            sentinal = 1
        }

        if (sentinal === 1) {
            //console.log(formFeildMap, comparisonFieldList[j])
            result.push({
                fieldName: comparisonFieldList[j],
                name: formFeildMap[comparisonFieldList[j]] || comparisonFieldList[j],//自定义字段的显示名称和字段名相同
                newValue,
                oldValue,
                userId: editData[i].userId,
                createTime: editData[i].创建时间,
                config: currentConfig,
                form: currentConfig?.form,
                type: currentConfig?.type,
                key: currentConfig?.key,
                column: currentConfig?.column
            })
        }
    }
}
return { record: result }