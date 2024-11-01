window.roster = roster
window.style = style
window.measureBody = measureBody
window.originPureSizeList = originPureSizeList
window.orderConfig = orderConfig
window.department = department
window.userId = userId
let importRoster = [];
for (let k = 0; k < roster.length; k++) {
    const currentRoster = roster[k];
    if (!currentRoster.款式号与尺码) {
        continue;
    }
    const styleSizeList = currentRoster.款式号与尺码.split(",");
    let importStyleList = [];
    for (let n = 0; n < styleSizeList.length; n++) {
        const currentStyleSize = styleSizeList[n].split(":");
        const styleCode = currentStyleSize[0];
        let currentStyle = style.find(sub => sub.styleCode === styleCode);
        // 是否有款式
        if (!currentStyle) {
            return { code: "style_err_1", reason: "款式填写错误", currentRoster };
        }
        currentStyle = JSON.parse(JSON.stringify(currentStyle));
        currentStyle.number = 1;
        // 是否填写规格
        if (!currentStyleSize[1] || !currentStyleSize[1].split("#")[0]) {
            return { code: "standard_err_1", reason: "规格未填写", currentRoster };
        }
        const change = currentStyleSize[1]
        const standard = change.split("#")[0]
        let standardItemList = []
        if (currentStyle.styleOrigin === "sizeClass") {
            // 标准尺码类
            if (currentStyle?.assistAttribute.find(i => i.standard === standard)) {
                currentStyle.standard = standard;
                currentStyle.extra = { "单人员": { "首单": { "standard": standard } } };
                currentStyle.assistAttributeId = currentStyle?.assistAttribute.find(i => i.standard === standard).数据ID;
            } else {
                return { code: "standard_err_2", reason: "规格填写错误", currentRoster };
            }
        } else if (currentStyle.styleOrigin === "style") {
            // 款式的情况
            const specification = currentStyle.规格表详情;
            const template = currentStyle.样板详情;
            const specificationData = specification.data;
            const group = Object.keys(specificationData).filter(i => i.includes("group")).sort();
            for (let j = 0; j < group.length; j++) {
                let currentStandardItemList = specificationData[group[j]][0].data.map(i => { i.class = group[j].slice(-1); return i });
                standardItemList = standardItemList.concat(currentStandardItemList);
            }
            let standardHeaders = specification.standardHeaders;
            if (standardItemList.some(i => i.standard === standard)) {
                // 尺寸修改
                const sizeChange = change.split("#")[1];
                // 规格选项
                const standardItem = standardItemList.find(i => i.standard === standard);
                // 尺码
                const size = standardItem.size;
                currentStyle.standard = standard;
                currentStyle.size = size;
                currentStyle.extra = { "单人员": { "首单": { "standard": standard, size } } };
                currentStyle.specificationId = specification.数据ID;
                if (sizeChange) {
                    // 字母开头
                    const startWord = (/^[A-Z]+/).test(sizeChange); // bool
                    // 指标列表
                    const headers = sizeChange.match(/[A-Z]+/g) || [];
                    if (!startWord || !headers || headers.length === 0 || headers.some(i => !standardHeaders.map(sub => sub.code).includes(i))) {
                        return { code: "standard_err_4", reason: "规格指标填写错误", currentRoster };
                    }
                    // 修改值
                    const changeValue = sizeChange.match(/-?[0-9]+(\.[0-9]+)?/g);
                    if (!changeValue || changeValue.length !== headers.length) {
                        return { code: "standard_err_5", reason: "规格指标填写错误", currentRoster };
                    }
                    // 指标详情列表
                    const headerValue = headers.map((i, j) => { let a = standardHeaders.find(sub => sub.code === i); a.value = changeValue[j] * 1; return a });
                    currentStyle.change = headerValue.map(i => i.code + i.value).join(",");
                    for (let z = 0; z < headerValue.length; z++) {
                        // 当前指标
                        const currentValue = headerValue[z];
                        // 样板指标量体
                        const measureDetail = template.measureDetail;
                        // 规格指标量体
                        const specificationMeasure = specification.data.measure;
                        // 当前指标详情
                        let valueDetail = measureDetail.find(i => i.title === currentValue.title).data;
                        if (!valueDetail) {
                            valueDetail = specificationMeasure.find(i => i.name === currentValue.title).data;
                        }
                        // 人工跳档
                        const pass = valueDetail.find(i => i.name == "人工调整跳档")
                        if (!pass || !pass.value) {
                            return { code: "standard_err_6", reason: "规格指标填写错误" };
                        }
                        if (currentValue.value % pass.value !== 0) {
                            return { code: "standard_err_7", reason: "规格指标值非人工调整跳档整数倍" };
                        }
                        // 体型
                        const bodySize = "group" + standardItem.class;
                        // 指标标准值
                        const commonValue = specificationData[bodySize].find(i => i.name == currentValue.title)?.data.find(i => i.standard == standard);
                        currentValue.智能样板正调整极限 = valueDetail.find(i => i.name == "智能样板正调整极限")?.value;
                        currentValue.智能样板负调整极限 = valueDetail.find(i => i.name == "智能样板负调整极限")?.value;
                        currentValue.人工正调整极限 = valueDetail.find(i => i.name == "人工正调整极限")?.value;
                        currentValue.人工负调整极限 = valueDetail.find(i => i.name == "人工负调整极限")?.value;
                        currentValue.人工调整跳档 = valueDetail.find(i => i.name == "人工调整跳档")?.value;
                        currentValue.value = currentValue.value;
                        currentValue.originValue = commonValue.value;
                        if (currentValue.value < -currentValue.智能样板负调整极限 || currentValue.value > currentValue.智能样板正调整极限) {
                            currentStyle.templateLmitAbnormal = 1;
                        }
                        if (currentValue.value >= -currentValue.人工负调整极限 || currentValue.value <= currentValue.人工正调整极限) {
                            // 量体组合异常
                            // 量体组合
                            const headersGroup = specification.headersGroup;
                            // 当前量体组合
                            const currentHeadersGroup = headersGroup.filter(i => i.find(sub => sub.name == currentValue.title && i.find(item => headerValue.map(e => e.title).includes(item.name))));
                            // console.log("currentHeadersGroup", currentHeadersGroup);
                            for (let v = 0; v < currentHeadersGroup.length; v++) {
                                // 组合指标名称
                                const groupValueName = currentHeadersGroup[v].find(i => i.name != currentValue.title).name;
                                // 组合指标
                                const groupValue = headerValue.find(i => i.title == groupValueName);
                                const expand = (groupValue.value / groupValue.人工调整跳档) * currentValue.人工调整跳档;
                                if (currentValue.value < expand - currentValue.智能样板负调整极限 || currentValue.value > expand + currentValue.智能样板正调整极限) {
                                    currentStyle.templateLmitAbnormal = 1;
                                }
                                if (currentValue.value < expand - currentValue.人工负调整极限 || currentValue.value > expand + currentValue.人工正调整极限) {
                                    return { code: "standard_err_9", reason: "规格指标量体组合值超过人工调整极限" };
                                }
                            }
                        } else {
                            return { code: "standard_err_8", reason: "规格指标值超过人工调整极限", currentRoster };
                        }
                        // console.log("currentValue", currentValue);
                    }
                }
            } else {
                return { code: "standard_err_3", reason: "规格填写错误", currentRoster };
            }
        }
        let importStyle = {
            measureBodyId: measureBody.数据ID,
            standard: currentStyle.standard,
            extra: currentStyle.extra,
            styleId: currentStyle.styleId,
            styleOrigin: currentStyle.styleOrigin,
            styleCode: currentStyle.styleCode,
            number: currentStyle.number,
            import: 1,
            memberId: currentRoster.ID || null,
            orderId: measureBody.orderId
        }
        if (importStyle.styleOrigin === "sizeClass") {
            importStyle.assistAttribute = currentStyle.assistAttributeId;
        } else {
            importStyle.size = currentStyle.size;
            importStyle.change = currentStyle.change;
            importStyle.manualChange = currentStyle.manualChange;
            importStyle.templateLmitAbnormal = currentStyle.templateLmitAbnormal;
            importStyle.specificationId = currentStyle.specificationId;
        }
        importStyleList.push(importStyle);
    }
    // 净尺寸处理
    let pureSizeList = JSON.parse(JSON.stringify(originPureSizeList))
    for (let n = 0; n < pureSizeList.length; n++) {
        if (currentRoster[pureSizeList[n].name]) {
            pureSizeList[n].value = currentRoster[pureSizeList[n].name]
        }
    }
    pureSizeList = pureSizeList.filter(i => i.value);
    const pureSizeImport = !!currentRoster.身高 && !!currentRoster.体重 ? 1 : 0;
    let currentOrderConfig;
    let sameConfig = false;
    if (currentRoster.配置) {
        // 当前配置
        currentOrderConfig = orderConfig.find(i => i.name === currentRoster.配置);
        // 已有配置
        const orderConfigCode = currentOrderConfig.code;
        // 配置数组
        const configArr = orderConfigCode.split(",");
        for (let n = 0; n < configArr.length; n++) {
            // 当前配置详情
            let configDetail = {
                styleCode: configArr[n].split("-")[0],
                number: configArr[n].split("-")[1] * 1
            }
            if (importStyleList.length && importStyleList.filter(i => i.styleCode === configDetail.styleCode).length === 1) {
                let index = importStyleList.findIndex(i => i.styleCode === configDetail.styleCode);
                importStyleList[index].number = configDetail.number;
            }
        }
        const sizeClassList = importStyleList.filter(i=>i.styleOrigin=="sizeClass").sort((pre, next) => pre.styleCode - next.styleCode);
        const styleList = importStyleList.filter(i=>i.styleOrigin=="style").sort((pre, next) => pre.styleCode - next.styleCode);
        const arr = styleList.concat(sizeClassList)
        let configCode = [...(new Set(arr.map(i=>i.styleCode)))].reduce((total,cur)=>{var sum = arr.filter(j=>j.styleCode==cur).reduce((sum,item)=>{sum=sum+item.number;return sum;},0);total.push(cur+"-"+sum);return total;},[]).join(",")
        // 配置一致
        sameConfig = configCode === orderConfigCode
    }
    importRoster.push({
        measureBodyId: measureBody.数据ID,
        memberId: currentRoster.ID,
        memberName: currentRoster.姓名,
        department: department,
        sex: currentRoster.性别=="男" ? 1 : 0,
        employeeId: currentRoster.工号,
        itemNum: importStyleList.filter(item=>!!item.styleId).reduce((pre,cur)=>{return pre+cur.number},0),
        description: [],
        measureUserId: null,
        measureStatus: sameConfig ? 3 : 0,
        approveStatus: 2,
        config: sameConfig ? currentOrderConfig?.code : null,
        pureSize: pureSizeList,
        pureSizeReport: 0,
        delete: 0,
        new: 0,
        personalMeasureBodyStyle: importStyleList,
        addMethod: "导入",
        pureSizeImport,
        companyId: measureBody.数据ID,
        orderId: measureBody.orderId,
        orderConfigId: sameConfig ? currentOrderConfig?.数据ID : null,
        一级部门: currentRoster.一级部门,
        二级部门: currentRoster.二级部门,
        三级部门: currentRoster.三级部门,
        四级部门: currentRoster.四级部门,
        五级部门: currentRoster.五级部门,
        index: currentRoster.index,
        measureUserId: sameConfig ? userId : null
    })
}
return {importRoster}