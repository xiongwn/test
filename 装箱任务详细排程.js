// 产线department
// 在这些产线上已排装箱任务
scheduledPackageTask = scheduledPackageTask.filter(i => i.planWorkSecond)
/*window.department = department
window.scheduledPackageTask = scheduledPackageTask
*/

// 时间对象
function formatDate(c_time) {
    let i_date = new Date(c_time)
    let year = i_date.getFullYear()
    let month = i_date.getMonth() + 1
    let date = i_date.getDate()
    let day = i_date.getDay()
    // if (day === 0) {day = 7}
    let str = year + "-" + (month.toString().padStart(2, "0")) + "-" + (date.toString().padStart(2, "0"))
    let time = new Date(str).getTime()
    return { year, month, date, day, str, time }
}

// 该部门在当天用了多少秒
function deptUsage(dept_id, dateStr) {
    let usage = scheduledPackageTask.filter(e => e.dept_id === dept_id && e.planWorkDetail && e.planWorkDetail && e.planWorkDetail.some(sub => sub.date === dateStr))
        .map(e => e.planWorkDetail.filter(sub => sub.date === dateStr))
        .flat()
        .reduce((pre, next) => pre + next.usage, 0)
    return usage
}

// department.workHourList [0, 21120, 21120, 21120, 21120, 21120, 21120] 从周日开始的可用分钟数
department.forEach(e => {
    // 产线workHourList转换成second
    if (e.workHourList) {
        e.workSecondList = e.workHourList.map(sub => sub * 60)
    }
})

packageTask.forEach(e => {
    e.sectionStartDateObj = formatDate((new Date(e.availablePlanDate).getTime() || Date.now()) + 86400000)
})

// 给装箱任务默认排序
packageTask.sort((pre, next) => pre.sectionStartDateObj.time - next.sectionStartDateObj.time)

for (let i = 0; i < packageTask.length; i++) {
    let currentPackageTask = packageTask[i]
    let departmentList = JSON.parse(JSON.stringify(department.filter(sub => sub.path.includes(currentPackageTask.factory_dept_id))))
    let cacheDeptList = []
    let sectionStartDateObj = currentPackageTask.sectionStartDateObj
    // 按装箱产线循环，看每个产线排完各需要多少天
    for (let j = 0; j < departmentList.length; j++) {
        // 产线
        let dept = departmentList[j]
        // detail_4.每件完成用时
        let 每件完成用时 = dept.detail_4.每件完成用时
        let deptWorkSecondList = dept.workSecondList
        // 在该产线上的已有排程
        let c_schedule = scheduledPackageTask.filter(e => e.dept_id === dept.dept_id)
        // 具体到每天有多少usage
        let scheduleDetail = []
        for (let n = 0; n < c_schedule.length; n++) {
            if (c_schedule[n].planWorkDetail) {
                scheduleDetail = scheduleDetail.concat(c_schedule[n].planWorkDetail.map(e => {
                    e.packageTaskId = c_schedule[n].数据ID
                    return e
                }))
            }
        }
        // console.log("scheduleDetail", scheduleDetail)
        // 根据剩余数量和开始时间sectionStartDateObj循环
        let totalWorkSecond = 每件完成用时 * currentPackageTask.uuids.length
        let left = totalWorkSecond
        // 订单在该产线排的话的详细usage信息
        let x_detail = []
        while (left > 0) {
            // 当天生成力，看当天是星期几
            let { day, str } = sectionStartDateObj
            // console.log("sectionStartDateObj", sectionStartDateObj)
            let deptWorkSecond = deptWorkSecondList[day]
            // 当天没产能就往后一天再处理
            if (!deptWorkSecond) {
                sectionStartDateObj = formatDate(sectionStartDateObj.time + 86400000)
                continue
            }
            // 当天其他订单的排程
            let anotherProductionOrder = scheduleDetail.filter(e => e.date === str)
            // 当天可用时间
            let availableTime = deptWorkSecond - anotherProductionOrder.reduce((pre, next) => pre + next.usage, 0)
            // 当天没可用时间往后一天再处理
            if (availableTime === 0) {
                sectionStartDateObj = formatDate(sectionStartDateObj.time + 86400000)
                continue
            }
            // 可用时间大于剩余时间
            if (availableTime >= left) {
                x_detail.push({ date: str, usage: left })
                left = 0
            } else {
                // 当天可用时间不足以处理剩余时，检查有没有跨当前日期的订单如果有，需要删掉x_detail以当天为起点重新开始
                if (x_detail.length === 0 ||
                    anotherProductionOrder.length === 0 ||
                    scheduleDetail.some(e => {
                        return e.date === x_detail.slice(-1)[0].str && anotherProductionOrder.some(sub => sub.productionOrderId === e.productionOrderId)
                    })) {
                    x_detail = []
                    left = totalWorkSecond
                }
                x_detail.push({ date: str, usage: availableTime })
                left -= availableTime
                sectionStartDateObj = formatDate(sectionStartDateObj.time + 86400000)
            }
        }
        // 该产线的起止时间
        let startDate = x_detail[0].date
        let endDate = x_detail.slice(-1)[0].date
        cacheDeptList.push({
            dept_id: dept.dept_id,
            startDate,
            endDate,
            x_detail,
            second: totalWorkSecond
        })
    }
    // 最快结束的产线
    let cacheDept = cacheDeptList.sort((pre, next) => pre.endDate.replace(/-/g, "") - next.endDate.replace(/-/g, ""))[0]
    currentPackageTask.planStartDate = cacheDept.startDate
    currentPackageTask.planEndDate = cacheDept.endDate
    currentPackageTask.planWorkDetail = cacheDept.x_detail
    currentPackageTask.dept_id = cacheDept.dept_id
    scheduledPackageTask.push(currentPackageTask)
}

console.log(packageTask)
//return {packageTask}