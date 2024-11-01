// 造假数据
/*
let productionOrder
let schedule
let department
*/
/*window.productionOrder = productionOrder
window.schedule = schedule
window.department = department*/
// console.log("productionOrder", productionOrder)
schedule = schedule.filter(e => e.extra && e.extra.detail)
// 时间对象
function formatDate(c_time) {
    let i_date = new Date(c_time)
    let year = i_date.getFullYear()
    let month = i_date.getMonth() + 1
    let date = i_date.getDate()
    let day = i_date.getDay()
    if (day === 0) {
        day = 7
    }
    let str = year + "-" + (month.toString().padStart(2, "0")) + "-" + (date.toString().padStart(2, "0"))
    let time = new Date(str).getTime()
    return { year, month, date, day, str, time }
}

// 该部门在当天用了多少秒
function deptUsage(dept_id, dateStr) {
    let usage = schedule.filter(e => e.dept_id === dept_id && e.extra && e.extra.detail && e.extra.detail.some(sub => sub.date === dateStr))
        .map(e => e.extra.detail.filter(sub => sub.date === dateStr))
        .flat()
        .reduce((pre, next) => pre + next.usage, 0)
    return usage
}

// 当前日期字符串
let currentDateStr = formatDate(Date.now()).str


// department.workHourList [0, 21120, 21120, 21120, 21120, 21120, 21120] 从周日开始的可用分钟数
department.forEach(e => {
    // 产线workHourList转换成second
    if (e.type === 1 && e.workHourList) {
        e.workSecondList = e.workHourList.map(sub => sub * 60)
    }
})

productionOrder.forEach(e => {
    e.cacheSchedule = []
    // e.scheduleStatus = 2
})


// 明天的日期
let tommorow = formatDate(Date.now() + 86400000).str
for (let i = 0; i < productionOrder.length; i++) {
    // 厂区id
    let factory_dept_id = productionOrder[i].dept_id
    // 可用后整理部门
    let c_reworkDepartment_list = productionOrder[i].departmentList.flat() //department.filter(e => e.path.includes(factory_dept_id) && e.sectionType === "后整理")
    // 没有后整理部门就处理下一个生产订单
    if (c_reworkDepartment_list.length === 0) {
        continue
    }
    // 详细排程预计开始时间
    let planStartDate = tommorow

    let reworkStartDateObj = formatDate(new Date(productionOrder[i].materialAvailableDate > planStartDate ? productionOrder[i].materialAvailableDate : planStartDate))
    for (let j = 0; j < c_reworkDepartment_list.length; j++) {
        // 当前后整理产线
        Object.assign(c_reworkDepartment_list[j], department.find(e => e.dept_id === c_reworkDepartment_list[j].dept_id))
    }
    // 按照产能（totalWorkSecond从小到大）排序
    c_reworkDepartment_list = c_reworkDepartment_list.filter(e => e.totalWorkSecond && e.workSecondList).sort((pre, next) => pre.totalWorkSecond - next.totalWorkSecond)

    for (let j = 0; j < c_reworkDepartment_list.length; j++) {
        // 当前产线
        let dept = Object.assign(c_reworkDepartment_list[j], department.find(e => e.dept_id === c_reworkDepartment_list[j].dept_id))
        // 该部门生产力
        // console.log("dept", dept)
        let deptWorkSecondList = dept.workSecondList.slice(1).concat(dept.workSecondList[0])
        // 在该产线上的已有排程
        let c_schedule = schedule.filter(e => e.dept_id === dept.dept_id)
        // 具体到每天有多少usage
        let scheduleDetail = []
        for (let n = 0; n < c_schedule.length; n++) {
            if (c_schedule[n].extra && c_schedule[n].extra.detail) {
                scheduleDetail = scheduleDetail.concat(c_schedule[n].extra.detail.map(e => {
                    e.productionOrderId = c_schedule[n].productionOrderId
                    return e
                }))
            }
        }
        let left = c_reworkDepartment_list[j].totalWorkSecond
        let totalWorkSecond = c_reworkDepartment_list[j].totalWorkSecond
        console.log("left", left)
        // 订单在该产线排的话的详细usage信息
        let x_detail = []

        // 处理时间大于等于明天时
        while (left > 0) {
            // 当天生产力，看当天是星期几
            let { day, str } = reworkStartDateObj
            let deptWorkSecond = deptWorkSecondList[day - 1]
            // 当天没产能就往后一天再处理
            if (deptWorkSecond === 0) {
                reworkStartDateObj = formatDate(reworkStartDateObj.time + 86400000)
                continue
            }
            // 当天其他订单的排程
            let anotherProductionOrder = scheduleDetail.filter(e => e.date === str)
            // 当天可用时间
            let availableTime = deptWorkSecond - anotherProductionOrder.reduce((pre, next) => pre + next.usage, 0)
            // 当天没可用时间往后一天再处理
            if (availableTime === 0) {
                reworkStartDateObj = formatDate(reworkStartDateObj.time + 86400000)
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
                reworkStartDateObj = formatDate(reworkStartDateObj.time + 86400000)
            }
        }
        if (left === 0) {
            // 该产线的起止时间
            let endDate = x_detail[0].date
            let startDate = x_detail.slice(-1)[0].date
            let detail = {
                dept_id: dept.dept_id,
                startDate,
                endDate,
                x_detail,
                second: totalWorkSecond,
                factory_dept_id: dept.factory_dept_id,
                group_id: dept.group_id
            }
            let reworkSchedule = {
                userNum: userList.filter(item => item.dept_id_list.includes(detail.dept_id)).length,
                attendanceGroup: attendanceGroup.find(item => item.group_id === detail.group_id),
                sectionType: "后整理",
                endDate: detail.endDate,
                startDate: detail.startDate,
                productionOrderId: productionOrder[i].数据ID,
                orderId: productionOrder[i].orderId,
                dept_id: detail.dept_id,
                second: detail.second,
                factory_dept_id: detail.factory_dept_id,
                extra: { detail: detail.x_detail }
            }
            productionOrder[i].cacheSchedule.push(reworkSchedule)
            schedule.push(reworkSchedule)
            break
        }
    }
}

// --------------------返修从后整理的起始时间开始往前倒推-------------------
// 明天的日期
// let tommorow = formatDate(Date.now() + 86400000).str
for (let i = 0; i < productionOrder.length; i++) {
    // 厂区id
    let factory_dept_id = productionOrder[i].dept_id
    // 可用返修部门
    let c_reworkDepartment_list = department.filter(e => e.path.includes(factory_dept_id) && e.sectionType === "返修")
    // 没有返修部门就处理下一个生产订单
    if (c_reworkDepartment_list.length === 0) {
        continue
    }
    // 详细排程预计开始时间
    let planStartDate = tommorow

    let reworkStartDateObj = formatDate(new Date(planStartDate))
    for (let j = 0; j < c_reworkDepartment_list.length; j++) {
        // 当前返修产线
        let dept = Object.assign(c_reworkDepartment_list[j], department.find(e => e.dept_id === c_reworkDepartment_list[j].dept_id))
        if (dept.totalWorkSecond >= 0) {
            continue
        }
        let left = productionOrder[i].reworkTime
        // 返修总耗时
        c_reworkDepartment_list[j].totalWorkSecond = left
    }
    // 按照产能（totalWorkSecond从小到大）排序
    c_reworkDepartment_list = c_reworkDepartment_list.filter(e => e.totalWorkSecond && e.workSecondList).sort((pre, next) => pre.totalWorkSecond - next.totalWorkSecond)

    for (let j = 0; j < c_reworkDepartment_list.length; j++) {
        // 当前产线
        let dept = Object.assign(c_reworkDepartment_list[j], department.find(e => e.dept_id === c_reworkDepartment_list[j].dept_id))
        // 该部门生产力
        // console.log("dept", dept)
        let deptWorkSecondList = dept.workSecondList.slice(1).concat(dept.workSecondList[0])
        // 在该产线上的已有排程
        let c_schedule = schedule.filter(e => e.dept_id === dept.dept_id)
        // 具体到每天有多少usage
        let scheduleDetail = []
        for (let n = 0; n < c_schedule.length; n++) {
            if (c_schedule[n].extra && c_schedule[n].extra.detail) {
                scheduleDetail = scheduleDetail.concat(c_schedule[n].extra.detail.map(e => {
                    e.productionOrderId = c_schedule[n].productionOrderId
                    return e
                }))
            }
        }
        let left = c_reworkDepartment_list[j].totalWorkSecond
        let totalWorkSecond = c_reworkDepartment_list[j].totalWorkSecond
        // 订单在该产线排的话的详细usage信息
        let x_detail = []

        // 处理时间大于等于明天时
        while (left > 0) {
            // 当天生产力，看当天是星期几
            let { day, str } = reworkStartDateObj
            let deptWorkSecond = deptWorkSecondList[day - 1]
            // 当天没产能就往后一天再处理
            if (deptWorkSecond === 0) {
                reworkStartDateObj = formatDate(reworkStartDateObj.time + 86400000)
                continue
            }
            // 当天其他订单的排程
            let anotherProductionOrder = scheduleDetail.filter(e => e.date === str)
            // 当天可用时间
            let availableTime = deptWorkSecond - anotherProductionOrder.reduce((pre, next) => pre + next.usage, 0)
            // 当天没可用时间往后一天再处理
            if (availableTime === 0) {
                reworkStartDateObj = formatDate(reworkStartDateObj.time - 86400000)
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
                reworkStartDateObj = formatDate(reworkStartDateObj.time + 86400000)
            }
        }
        if (left === 0) {
            // 该产线的起止时间
            let endDate = x_detail[0].date
            let startDate = x_detail.slice(-1)[0].date
            let detail = {
                dept_id: dept.dept_id,
                startDate,
                endDate,
                x_detail,
                second: totalWorkSecond,
                factory_dept_id: dept.factory_dept_id,
                group_id: dept.group_id
            }
            let reworkSchedule = {
                userNum: userList.filter(item => item.dept_id_list.includes(detail.dept_id)).length,
                attendanceGroup: attendanceGroup.find(item => item.group_id === detail.group_id),
                sectionType: "返修",
                endDate: detail.endDate,
                startDate: detail.startDate,
                productionOrderId: productionOrder[i].数据ID,
                orderId: productionOrder[i].orderId,
                dept_id: detail.dept_id,
                second: detail.second,
                factory_dept_id: detail.factory_dept_id,
                extra: { detail: detail.x_detail }
            }
            productionOrder[i].cacheSchedule.push(reworkSchedule)
            schedule.push(reworkSchedule)
            break
        }
    }
}

productionOrder.forEach(e => {
    let c_schedule = e.cacheSchedule
    e.planStartDate = c_schedule.sort((pre, next) => pre.startDate.replace(/-/g, "") - next.startDate.replace(/-/g, ""))[0].startDate
    e.planEndDate = c_schedule.sort((pre, next) => next.endDate.replace(/-/g, "") - pre.endDate.replace(/-/g, ""))[0].endDate
    // e.scheduleStatus = 2
})
//console.log("schedule", schedule)
//console.log("productionOrder", productionOrder)
return { result: productionOrder, schedule }