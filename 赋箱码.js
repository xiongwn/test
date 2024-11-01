// code前缀
let nCode = packageTask.code.split(".").slice(-2).join(".")
let content = boxConfig.content
let length = content.length
product = product.map(i => { i.memberId = roster.find(sub => sub.personalMeasureBodyId === (i.personalMeasureBodyId_1 || i.personalMeasureBodyId)).memberId; return i })
let index
// planB
if (packagePlanType === "B") {
    // ---------package_material_1_code-----------
    // 流水号
    if (!product[0].package_material_1_code || product[0].package_material_1_code.split(".").slice(1, 3) !== nCode) {
        index = 0
        for (let i = 0; i < orderPackagePlan.length; i++) {
            let userList = orderPackagePlan[i].userList
            for (let j = 0; j < userList.length; j++) {
                index++
                let package_material_1_code = "M." + nCode + "." + index
                product.filter(sub => orderPackagePlan[i].uuids.includes(sub.uuid) && userList[j] === sub.memberId).forEach(e => {
                    if (orderPackagePlan[i].package_material_1 && orderPackagePlan[i].package_material_1.length > 0) {
                        e.package_material_1_code = package_material_1_code;
                        e.package_material_1 = orderPackagePlan[i].package_material_1
                    }
                    e.package_material_categroyId = orderPackagePlan[i].package_material_categroyId
                })
            }
        }
    }

    // ---------package_material_2_code-----------
    if (orderPackagePlan.some(i => i.package_material_2) && (!product[0].package_material_2_code || product[0].package_material_2_code.split(".").slice(1, 3) !== nCode)) {
        index = 0
        let cacheOrderPackagePlan = orderPackagePlan.filter(i => i.package_material_2)
        let groupIdArr = Array.from(new Set(cacheOrderPackagePlan.map(i => i.groupId)))
        for (let i = 0; i < groupIdArr.length; i++) {
            let cache = cacheOrderPackagePlan.filter(sub => sub.groupId === groupIdArr[i])
            let userList = cache.map(sub => sub.userList).flat()
            let uuids = cacheOrderPackagePlan.filter(sub => sub.groupId === groupIdArr[i]).map(sub => sub.uuids).flat()
            for (let j = 0; j < userList.length; j++) {
                index++
                let package_material_2_code = "T." + nCode + "." + index
                product.filter(sub => uuids.includes(sub.uuid) && userList[j] === sub.memberId).forEach(e => {
                    e.package_material_2_code = package_material_2_code
                    e.package_material_2 = cache.package_material_2
                })
            }
        }
    }

    // ----------boxCode--------------
    // left的数量是装箱策略的总人数，不是衣服数量
    let boxCodeIndex = 0
    // 单独发货
    let specialDog = roster.filter(i => i.separateShip).map(i => i.memberId)
    if (specialDog.length > 0 && packagePlanType === "B") {
        // 批次索引
        let index = 0
        for (let i = 0; i < specialDog.length; i++) {
            let planList = orderPackagePlan.filter(e => e.userList.includes(specialDog[i]))
            let left = planList.length
            let member = roster.find(e => e.memberId === specialDog[i])
            let address = member.address
            if (!address) {
                return { code: "n_address_1", reason: member.orderPersonalInfo_memberName + "未设置单独发货地址" }
            }
            for (let j = 0; j < content.length; j++) {
                let min = content[j].min
                let max = content[j].max
                let boxMaterialCode = content[j].materialCode
                // 符合条件的衣服数量
                let num = 0
                while (left >= min) {
                    if (left >= max) {
                        left -= max
                        num += max
                    } else {
                        num += left
                        left = 0
                    }
                }
                if (num) {
                    let boxCode = "O." + nCode + "." + (++boxCodeIndex)
                    product.filter(e => e.memberId === specialDog[i] && planList.slice(index, index + num).map(e => e.uuids).flat().includes(e.uuid)).forEach(e => {
                        e.boxMaterialCode = boxMaterialCode;
                        e.boxCode = boxCode;
                        e.address = member.address;
                        e.contact = member.contact;
                        e.receiver = member.receiver;
                    })
                    index += num
                }
            }
            if (left) {
                let boxCode = "O." + nCode + "." + (++boxCodeIndex)
                product.filter(e => e.memberId === specialDog[i] && planList.slice(-left).map(e => e.uuids).flat().includes(e.uuid)).forEach(e => {
                    e.boxCode = boxCode;
                    e.boxMaterialCode = content.slice(-1)[0].materialCode;
                    e.address = member.address;
                    e.contact = member.contact;
                    e.receiver = member.receiver;
                })
            }
        }
    }

    // 按部门发货地址 有收获地址部门
    // 所有用户
    let totalUserList = Array.from(new Set(orderPackagePlan.map(i => i.userList).flat()))
    // 没有单独发货的人
    let leftUserList = totalUserList.filter(i => !specialDog.includes(i))
    if (leftUserList.length) {
        let departmentDog = roster.filter(i => customerDepartmentAddress.some(sub => sub.departmentIds.includes(i.departmentId)) && !specialDog.includes(i.memberId)).map(i => {
            let addressCache = customerDepartmentAddress.find(sub => sub.departmentIds.includes(i.departmentId));
            i.address = addressCache.address;
            i.addressId = addressCache.数据ID;
            return i
        })
        let addressList = Array.from(new Set(departmentDog.map(i => i.addressId)))
        let dogMemberIds = departmentDog.map(i => i.memberId)
        if (leftUserList.some(e => !dogMemberIds.includes(e))) {
            return { code: "n_address_2", reason: leftUserList.find(e => !dogMemberIds.includes(e)) + "未设置部门发货地址" }
        }
        // 都有发货地址则继续
        for (let i = 0; i < addressList.length; i++) {
            let addressId = addressList[i]
            let departmentAddress = customerDepartmentAddress.find(e => e.数据ID === addressId)
            let userList = departmentDog.filter(e => e.addressId === addressId).map(e => e.memberId)
            // [{memberId, planId}]
            let loopList = orderPackagePlan.filter(e => e.userList.some(sub => userList.includes(sub))).map(e => {
                let uList = e.userList.filter(sub => userList.includes(sub))
                return uList.map(sub => ({ memberId: sub, planId: e.数据ID }))
            }).flat()
            // loopList按memberId排序一下，让一个人的衣服尽量装在一个箱子里
            loopList = loopList.sort((pre, next) => pre.memberId - next.memberId)
            // 剩余数量
            let left = loopList.length
            let index = 0
            for (let j = 0; j < content.length; j++) {
                let min = content[j].min
                let max = content[j].max
                let boxMaterialCode = content[j].materialCode
                // 符合条件的衣服数量
                let num = 0
                while (left >= min) {
                    if (left >= max) {
                        left -= max
                        num += max
                    } else {
                        num += left
                        left = 0
                    }
                }
                if (num) {
                    let boxCode = "O." + nCode + "." + (++boxCodeIndex)
                    let cList = loopList.slice(index, index + num)
                    let uuids = orderPackagePlan.filter(e => cList.map(sub => sub.planId).includes(e.数据ID)).map(e => e.uuids).flat()
                    product.filter(e => cList.some(sub => sub.memberId === e.memberId) && uuids.includes(e.uuid)).forEach(e => {
                        e.boxMaterialCode = boxMaterialCode;
                        e.boxCode = boxCode;
                        e.contact = departmentAddress.phone;
                        e.receiver = departmentAddress.receiver;
                        e.address = departmentAddress.address;
                    })
                    index += num
                }
            }
            if (left) {
                let boxCode = "O." + nCode + "." + (++boxCodeIndex)
                let cList = loopList.slice(-left)
                let uuids = orderPackagePlan.filter(e => cList.map(sub => sub.planId).includes(e.数据ID)).map(e => e.uuids).flat()
                product.filter(e => cList.some(sub => sub.memberId === e.memberId) && uuids.includes(e.uuid)).forEach(e => {
                    e.boxCode = boxCode;
                    e.boxMaterialCode = content.slice(-1)[0].materialCode;
                    e.contact = departmentAddress.phone;
                    e.receiver = departmentAddress.receiver;
                    e.address = departmentAddress.address;
                })
            }
        }
    }
}
// planC
if (packagePlanType === "C") {
    // ---------package_material_1_code_C-----------
    // 流水号
    if (!product[0].package_material_1_code_C || product[0].package_material_1_code_C.split(".").slice(1, 3) !== nCode) {
        index = 0
        for (let i = 0; i < orderPackagePlan.length; i++) {
            let userList = orderPackagePlan[i].userList
            for (let j = 0; j < userList.length; j++) {
                index++
                let package_material_1_code_C = "M." + nCode + "." + index
                product.filter(sub => orderPackagePlan[i].uuids.includes(sub.uuid) && userList[j] === sub.memberId).forEach(e => {
                    if (orderPackagePlan[i].package_material_1 && orderPackagePlan[i].package_material_1.length > 0) {
                        e.package_material_1_code_C = package_material_1_code_C;
                        e.package_material_1_C = orderPackagePlan[i].package_material_1
                    }
                    e.package_material_categroyId_C = orderPackagePlan[i].package_material_categroyId
                })
            }
        }
    }

    // ---------package_material_2_code-----------
    if (orderPackagePlan.some(i => i.package_material_2) && (!product[0].package_material_2_code_C || product[0].package_material_2_code_C.split(".").slice(1, 3) !== nCode)) {
        index = 0
        let cacheOrderPackagePlan = orderPackagePlan.filter(i => i.package_material_2)
        let groupIdArr = Array.from(new Set(cacheOrderPackagePlan.map(i => i.groupId)))
        for (let i = 0; i < groupIdArr.length; i++) {
            let cache = cacheOrderPackagePlan.filter(sub => sub.groupId === groupIdArr[i])
            let userList = cache.map(sub => sub.userList).flat()
            let uuids = cacheOrderPackagePlan.filter(sub => sub.groupId === groupIdArr[i]).map(sub => sub.uuids).flat()
            for (let j = 0; j < userList.length; j++) {
                index++
                let package_material_2_code_C = "T." + nCode + "." + index
                product.filter(sub => uuids.includes(sub.uuid) && userList[j] === sub.memberId).forEach(e => {
                    e.package_material_2_code_C = package_material_2_code_C
                    e.package_material_2_C = cache.package_material_2
                })
            }
        }
    }

    // ----------boxCode--------------
    // left的数量是装箱策略的总人数，不是衣服数量
    let boxCodeIndex = 0
    // 按部门发货地址 有收获地址部门
    // 所有用户
    let totalUserList = Array.from(new Set(orderPackagePlan.map(i => i.userList).flat()))
    // 没有单独发货的人
    let specialDog = roster.filter(i => i.separateShip).map(i => i.memberId)
    let leftUserList = totalUserList.filter(i => !specialDog.includes(i))
    if (leftUserList.length) {
        let departmentDog = roster.filter(i => customerDepartmentAddress.some(sub => sub.departmentIds.includes(i.departmentId)) && !specialDog.includes(i.memberId)).map(i => {
            let addressCache = customerDepartmentAddress.find(sub => sub.departmentIds.includes(i.departmentId));
            i.address = addressCache.address;
            i.addressId = addressCache.数据ID;
            return i
        })
        let addressList = Array.from(new Set(departmentDog.map(i => i.addressId)))
        let dogMemberIds = departmentDog.map(i => i.memberId)
        if (leftUserList.some(e => !dogMemberIds.includes(e))) {
            return { code: "n_address_2", reason: leftUserList.find(e => !dogMemberIds.includes(e)) + "未设置部门发货地址" }
        }
        // 都有发货地址则继续
        for (let i = 0; i < addressList.length; i++) {
            let addressId = addressList[i]
            let departmentAddress = customerDepartmentAddress.find(e => e.数据ID === addressId)
            let userList = departmentDog.filter(e => e.addressId === addressId).map(e => e.memberId)
            // [{memberId, planId}]
            let loopList = orderPackagePlan.filter(e => e.userList.some(sub => userList.includes(sub))).map(e => {
                let uList = e.userList.filter(sub => userList.includes(sub))
                return uList.map(sub => ({ memberId: sub, planId: e.数据ID }))
            }).flat()
            // loopList按memberId排序一下，让一个人的衣服尽量装在一个箱子里
            loopList = loopList.sort((pre, next) => pre.memberId - next.memberId)
            // 剩余数量
            let left = loopList.length
            let index = 0
            for (let j = 0; j < content.length; j++) {
                let min = content[j].min
                let max = content[j].max
                let boxMaterialCode_C = content[j].materialCode
                // 符合条件的衣服数量
                let num = 0
                while (left >= min) {
                    if (left >= max) {
                        left -= max
                        num += max
                    } else {
                        num += left
                        left = 0
                    }
                }
                if (num) {
                    let boxCode_C = "O." + nCode + "." + (++boxCodeIndex)
                    let cList = loopList.slice(index, index + num)
                    let uuids = orderPackagePlan.filter(e => cList.map(sub => sub.planId).includes(e.数据ID)).map(e => e.uuids).flat()
                    product.filter(e => cList.some(sub => sub.memberId === e.memberId) && uuids.includes(e.uuid)).forEach(e => {
                        e.boxMaterialCode_C = boxMaterialCode_C;
                        e.boxCode_C = boxCode_C;
                        e.contact_C = departmentAddress.phone;
                        e.receiver_C = departmentAddress.receiver;
                        e.address_C = departmentAddress.address;
                    })
                    index += num
                }
            }
            if (left) {
                let boxCode_C = "O." + nCode + "." + (++boxCodeIndex)
                let cList = loopList.slice(-left)
                let uuids = orderPackagePlan.filter(e => cList.map(sub => sub.planId).includes(e.数据ID)).map(e => e.uuids).flat()
                product.filter(e => cList.some(sub => sub.memberId === e.memberId) && uuids.includes(e.uuid)).forEach(e => {
                    e.boxCode_C = boxCode_C;
                    e.boxMaterialCode_C = content.slice(-1)[0].materialCode;
                    e.contact_C = departmentAddress.phone;
                    e.receiver_C = departmentAddress.receiver;
                    e.address_C = departmentAddress.address;
                })
            }
        }
    }
}

return { result: product }