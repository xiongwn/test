// 造假数据
/*
let productionOrder
let schedule
let department
*/
/*window.productionOrder = productionOrder
window.schedule = schedule
window.cutDepartment = cutDepartment
window.materialUsage = materialUsage
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

// 工段顺序
let sectionTypeList = ["缝制", "后整理", "水洗记忆"]
// 当前日期字符串
let currentDateStr = formatDate(Date.now()).str


// department.workHourList [0, 21120, 21120, 21120, 21120, 21120, 21120] 从周日开始的可用分钟数
department.forEach(e => {
    // 产线workHourList转换成second
    if (e.type === 1 && e.workSecondList) {
        e.workSecondList = e.workHourList.map(sub => sub * 60)
    }
})

// 生产订单排程是从缝制开始时间
productionOrder.forEach(e => {
    e.sectionStartDateObj = formatDate((new Date(e.materialAvailableDate).getTime() || Date.now()) + 86400000)
    // e.sectionStartDateObj = formatDate(Date.now() + 86400000)
    // 设置考勤
    e.departmentList = e.departmentList.map(i => {
        return i.map(sub => {
            // console.log("sub", sub)
            let dept = department.find(n => n.dept_id === sub.dept_id)
            sub.workSecondList = dept.workSecondList
            // 没有设置考勤的默认周一到周五，每天7小时
            if (!sub.workSecondList) {
                sub.workSecondList = [0, ...(new Array(5).fill(dept.employNum * 7 * 3600)), 0]
            }
            return sub
        })
    })
    //.filter(e => e.every(sub => sub.workSecondList))
})
// console.log("productionOrder", productionOrder)

// 按工段循环
for (let s_index = 0; s_index < sectionTypeList.length; s_index++) {
    let currentSectionType = sectionTypeList[s_index]
    let c_productionOrder = productionOrder.filter(e => {
        return e.departmentList.some(sub => {
            return sub.some(n => n.sectionType === currentSectionType)
        })
    })
    c_productionOrder.forEach(e => {
        // 每个方案的剩余总时长
        let leftTimePlanList = e.departmentList
            .map(sub => {
                return sub.filter(n => {
                    return sectionTypeList.slice(s_index).includes(n.sectionType)
                })
                    .reduce((pre, next) => pre + next.totalWorkSecond, 0)
            })
        // 每个方案的剩余时间
        e.leftTimePlanList = leftTimePlanList
        // 所有方案的平均剩余时间
        e.avarageLeftTime = leftTimePlanList.reduce((pre, next) => pre + next, 0) / leftTimePlanList.length
    })
    // 按平均剩余时间排序，小的先排
    c_productionOrder = c_productionOrder.sort((pre, next) => pre.avarageLeftTime - next.avarageLeftTime)
    for (let i = 0; i < c_productionOrder.length; i++) {
        let currentProductionOrder = c_productionOrder[i]
        let departmentList = currentProductionOrder.departmentList
        let sectionStartDateObj = currentProductionOrder.sectionStartDateObj
        let cacheDeptList = []
        // 按方案循环
        for (let j = 0; j < departmentList.length; j++) {
            // 判断该部门是否排过，不同方案的当前工段部门可能相同
            let dept = departmentList[j].find(e => e.sectionType === currentSectionType)
            if (cacheDeptList.some(e => e.dept_id === dept.dept_id)) {
                continue
            }
            // 该部门生产力
            let deptWorkSecondList = dept.workSecondList.slice(1).concat(dept.workSecondList[0])
            // 没有排该产线就开始排
            //cacheDeptList.push(dept)
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
            // console.log("scheduleDetail", scheduleDetail)
            // 根据剩余数量和开始时间sectionStartDateObj循环
            let totalWorkSecond = dept.totalWorkSecond
            let left = dept.totalWorkSecond
            // 订单在该产线排的话的详细usage信息
            let x_detail = []
            while (left > 0) {
                // 当天生成力，看当天是星期几
                let { day, str } = sectionStartDateObj
                let deptWorkSecond = deptWorkSecondList[day - 1]
                // 当天没产能就往后一天再处理
                if (deptWorkSecond === 0) {
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
                second: totalWorkSecond,
                factory_dept_id: dept.factory_dept_id
            })

        }
        // 方案循环结束，根据起止时间选择方案
        let detail = cacheDeptList.sort((pre, next) => pre.endDate.replace(/-/g, "") - next.endDate.replace(/-/g, ""))[0]
        currentProductionOrder.sectionStartDateObj = formatDate(currentProductionOrder.sectionStartDateObj.time + 86400000)
        schedule.push({
            endDate: detail.endDate,
            startDate: detail.startDate,
            productionOrderId: currentProductionOrder.数据ID,
            orderId: currentProductionOrder.orderId,
            dept_id: detail.dept_id,
            second: detail.second,
            extra: { detail: detail.x_detail },
            //sectionStartDateObj: currentProductionOrder.sectionStartDateObj
        })
    }
}
productionOrder.forEach(e => {
    let c_schedule = schedule.filter(sub => sub.productionOrderId === e.数据ID)
    e.planStartDate = c_schedule.sort((pre, next) => pre.startDate.replace(/-/g, "") - next.startDate.replace(/-/g, ""))[0].startDate
    e.planEndDate = c_schedule.sort((pre, next) => next.endDate.replace(/-/g, "") - pre.endDate.replace(/-/g, ""))[0].endDate
    e.cacheSchedule = c_schedule
    // e.scheduleStatus = 2
})


// --------------------裁剪从缝制的起始时间开始往前倒推-------------------
// 明天的日期
let tommorow = formatDate(Date.now() + 86400000).str
for (let i = 0; i < productionOrder.length; i++) {
    // 厂区id
    let factory_dept_id = productionOrder[i].cacheSchedule[0].factory_dept_id
    // 该生产订单的算料结果
    let c_materialUsage_list = materialUsage.filter(e => e.productionOrderId === productionOrder[i].数据ID)
    // 没有算料结果就处理下一个生产订单
    if (c_materialUsage_list.length === 0) {
        continue
    }
    // 可用裁剪部门
    let c_cutDepartment_list = cutDepartment.filter(e => e.path.includes(factory_dept_id))
    // 没有裁剪部门就处理下一个生产订单
    if (c_cutDepartment_list.length === 0) {
        continue
    }
    // 详细排程预计开始时间
    let planStartDate = productionOrder[i].planStartDate

    // 如果开始时间是明天，则裁剪没法排，处理下一个生产订单
    if (tommorow === planStartDate) {
        continue
    }
    // 不同裁剪产线的临时方案列表
    let cacheDeptList = []
    let cutStartDateObj = formatDate(new Date(planStartDate) - 86400000)
    for (let j = 0; j < c_cutDepartment_list.length; j++) {
        // 当前裁剪产线
        let dept = Object.assign(c_cutDepartment_list[j], department.find(e => e.dept_id === c_cutDepartment_list[j].dept_id))
        if (dept.totalWorkSecond >= 0) {
            continue
        }
        // 每件裁剪工序用时 = 层数 x 层数单位用时+版长 x 版长单位用时+周长 x 周长单位用时+刀口数 x 刀口单位用时+（转折点数量+裁片数）x 单位起落刀时间
        let left = 0
        for (let k = 0; k < c_materialUsage_list.length; k++) {
            let c_materialUsage = c_materialUsage_list[k]
            // 版长
            let mMarker_Length = c_materialUsage.mMarker_Length || 0
            // 周长
            let mMarker_Total_Perim = c_materialUsage.mMarker_Total_Perim || 0
            // 层数
            let layerNum = c_materialUsage.layerNum || 0
            // 刀口数
            let Marker_Notches = c_materialUsage.Marker_Notches || 0
            // 转折点数量
            let Marker_corners = c_materialUsage.Marker_corners || 0
            // 裁片数
            let pieceNum = c_materialUsage.pieceNum || 0
            // 层数单位用时
            let 层数单位用时 = dept.detail_1.层数单位用时 || 0
            // 版长单位用时
            let 版长单位用时 = dept.detail_1.版长单位用时 || 0
            // 周长单位用时
            let 周长单位用时 = dept.detail_1.周长单位用时 || 0
            // 刀口单位用时
            let 刀口单位用时 = dept.detail_1.刀口单位用时 || 0
            // 单位起落刀时间
            let 单位起落刀时间 = dept.detail_1.单位起落刀时间 || 0
            let second = layerNum * 层数单位用时
                + 版长单位用时 * mMarker_Length
                + 周长单位用时 * mMarker_Total_Perim
                + 刀口单位用时 * Marker_Notches
                + 单位起落刀时间 * (Marker_corners + pieceNum)
            left += second
        }
        // 裁剪总耗时
        c_cutDepartment_list[j].totalWorkSecond = totalWorkSecond
    }
    // 按照产能（totalWorkSecond从小到大）排序
    c_cutDepartment_list = c_cutDepartment_list.filter(e => e.totalWorkSecond).sort((pre, next) => pre.totalWorkSecond - next.totalWorkSecond)

    for (let j = 0; j < c_cutDepartment_list.length; j++) {
        // 当前裁剪产线
        let dept = Object.assign(c_cutDepartment_list[j], department.find(e => e.dept_id === c_cutDepartment_list[j].dept_id))
        // 该部门生产力
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
        let left = c_cutDepartment_list[j].totalWorkSecond
        let totalWorkSecond = c_cutDepartment_list[j].totalWorkSecond
        // 订单在该产线排的话的详细usage信息
        let x_detail = []

        // 处理时间大于等于明天时
        while (cutStartDateObj.str >= tommorow && left > 0) {
            // 当天生产力，看当天是星期几
            let { day, str } = cutStartDateObj
            let deptWorkSecond = deptWorkSecondList[day - 1]
            // 当天没产能就往前一天再处理
            if (deptWorkSecond === 0) {
                cutStartDateObj = formatDate(cutStartDateObj.time - 86400000)
                continue
            }
            // 当天其他订单的排程
            let anotherProductionOrder = scheduleDetail.filter(e => e.date === str)
            // 当天可用时间
            let availableTime = deptWorkSecond - anotherProductionOrder.reduce((pre, next) => pre + next.usage, 0)
            // 当天没可用时间往前一天再处理
            if (availableTime === 0) {
                cutStartDateObj = formatDate(cutStartDateObj.time - 86400000)
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
                cutStartDateObj = formatDate(cutStartDateObj.time - 86400000)
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
                factory_dept_id: dept.factory_dept_id
            }
            let cutSchedule = {
                endDate: detail.endDate,
                startDate: detail.startDate,
                productionOrderId: productionOrder[i].数据ID,
                orderId: productionOrder[i].orderId,
                dept_id: detail.dept_id,
                second: detail.second,
                extra: { detail: detail.x_detail }
            }
            productionOrder[i].cacheSchedule.push(cutSchedule)
            schedule.push(cutSchedule)
            break
        }
    }
}
console.log("schedule", schedule)
console.log("productionOrder", productionOrder)
return { result: productionOrder, schedule }