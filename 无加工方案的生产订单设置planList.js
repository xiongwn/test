const detailMap = {
    缝制: "detail_2",
    水洗记忆: "detail_3",
    后整理: "detail_7"
}

for (let n = 0; n < productionOrder.length; n++) {
    // 所有可用产线
    let departmentTwoList = productionOrder[n].departmentTwoList
    // 裁剪产线
    let cut_dept_list = departmentTwoList.filter(i => i.sectionType === "裁剪")
    // 记忆水洗 0为不用记忆水洗
    const remember = productionOrder[n].style.remember
    // 需要投产的产线类型
    let planSectionArr = ["缝制"]
    // 忽略的产线类型
    let ignorePlanSectionArr = ["裁剪"]
    if (!remember) {
        ignorePlanSectionArr.concat("水洗记忆")
    } else {
        planSectionArr.concat("水洗记忆")
    }
    planSectionArr.concat("后整理")
    // 除裁剪外的产线
    let planDeptList = departmentTwoList.filter(i => !ignorePlanSectionArr.includes(i.sectionType))
    planDeptList.forEach(e => {
        e.departmentId = e.dept_id
        e.workSecond = 1 / e[detailMap[e.sectionType]].宏观效率
        e.factory_dept_id = productionOrder[n].dept_id
    })
    // 获取全排列函数
    /*
    preArr 上个函数传过来的数组
    currentIndex 当前对于planSectionArr的index
    */
    function scan(preArr, currentIndex) {
        const sectionType = planSectionArr[currentIndex]
        let deptList = planDeptList.filter(i => i.sectionType === sectionType)
        deptList = JSON.parse(JSON.stringify(deptList))
        if (currentIndex < planSectionArr.length - 1) {
            return deptList.map(i => scan(preArr.concat(i), currentIndex + 1)).flat()
        } else {
            //最后一层
            return deptList.map(i => preArr.concat(i))
        }
    }
    const planList = scan([], 0)
    productionOrder[n].planList = planList
}
return {result: productionOrder}