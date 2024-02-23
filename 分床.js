// 每个衣服的规格有一个字母，如果abc/y状态是合并standardType不同的可以在一床
product.forEach(i => {
    i.standardType = i.standard.match(/[a-z]/ig)[0]
    if (i.change) {
        i.changeArr = i.change.split(",").map(e => {
            let code = e.match(/[a-z]+/ig)[0]
            let value = e.match(/-*\d+/)[0] - 0
            return { code, value }
        })
    }
})

// 床号
let bedIndex = 0

/*
bedConfig = [{
    cutType: 1,
    cutMethod: 2,
    maxLevel: 3,
    maxNum: 4,
    evenLimit: 1,
    status: 1,
    distance: 1,
    changeLimit: []
}]
*/

// 每个配置都跑一遍所有衣服
for (let i = 0; i < bedConfig.length; i++) {
    // 物料号
    let materialCode = bedConfig[i].materialCode
    // 裁剪工具 1机器 2人工
    let cutType = bedConfig[i].cutType
    // 裁剪方式 1半件 2整件
    let cutMethod = bedConfig[i].cutMethod
    // 最高层数
    let maxLevel = bedConfig[i].maxLevel
    // 裁剪方式如果是半件，每个衣服占用2层
    if (cutMethod === 1) {
        maxLevel /= 2
    }
    // 最大套裁数
    let maxNum = bedConfig[i].maxNum
    // 最小套裁数
    let minNum = Math.ceil(maxNum / 2)
    // 限制偶数套裁数 1是
    let evenLimit = bedConfig[i].evenLimit
    // abc/y状态 合并1 分开2
    let status = bedConfig[i].status
    // 样片距离
    let distance = bedConfig[i].distance
    // 特提范围[{code,max,min}]
    let changeLimit = bedConfig[i].changeLimit

    // 人工排归并特体范围
    if (cutType === 2 && changeLimit && changeLimit.length > 0) {
        for (let j = 0; j < changeLimit.length; j++) {
            // code
            let code = changeLimit[j].code
            // range[{max,min}]
            let range = changeLimit[j].data
            // 设置了该特体code的衣服
            let d_prodcut = product.filter(e => e.changeArr.some(sub => sub.code === changeLimit[j].code))
            d_prodcut.forEach(e => {
                let codeIndex = e.changeArr.findIndex(sub => sub.code === code)
                let value = e.changeArr[codeIndex].value
                if (range.some(sub => sub.min <= value && sub.max >= value)) {
                    e.changeArr[codeIndex].value = range[0].min
                }
            })
        }
        product.forEach(e => {
            // 把修改过的特体值重新拼
            if (e.changeArr) {
                e.change = e.changeArr.map(sub => sub.code + sub.value).join(",")
            }
        })
    }
    // 按standard+size+change分组
    product.forEach(e => {
        e.groupUnicId = e.standard + e.size + e.change
    })
    // group相同才能放一列
    let groupList = Array.from(new Set(product.map(e => e.groupUnicId)))
    // group-map用来告知每个组里还有哪些衣服
    let groupMap = groupList.reduce((pre, next) => {
        pre[next] = product.filter(e => e.groupUnicId === next)
        return pre
    }, {})

    while (Object.values(groupMap).some(e => e.length)) {
        // 按每组剩余衣服给各组排序
        let sortedGroupList = Object.values(groupMap).filter(e => e.length).sort((pre, next) => next.length - pre.length)

        // status是分开的时候sortedGroupList的衣服需要有相同standardType
        if (status === 2) {
            sortedGroupList = sortedGroupList.filter(e => e.some(sub => sub.standardType === sortedGroupList[0][0].standardType))
        }
        // -------------------机器------------------
        if (cutType === 1) {
            // 按衣服数量最多组的衣服数量循环 j代表当前床所用层数
            for (let j = Math.min(sortedGroupList[0].length, maxLevel); j > 0; j--) {
                // 当前层高每组所能对应的列数
                let trueHeightList = sortedGroupList.map(e => Math.floor(e.length / j))
                let heightList = trueHeightList.filter(e => e > 0)

                // 限制列数是偶数并且可用列数是奇数，给最后一组减一列
                let totalRowNum = heightList.reduce((pre, next) => pre + next, 0)
                if (evenLimit === 1
                    && totalRowNum > 2
                    && (totalRowNum % 2)
                    && (trueHeightList.length !== heightList.length || totalRowNum > maxNum)
                ) {
                    heightList[heightList.length - 1] = heightList[heightList.length - 1] - 1
                }
                // 如果所有列数加到一起都无法满足最小值，则降一层
                if (heightList.reduce((pre, next) => pre + next, 0) < minNum && j > 1) {
                    continue
                }

                let rowNum = 0
                for (let k = 0; k < heightList.length; k++) {
                    let d_prodcut
                    if (maxNum - rowNum >= heightList[k]) {
                        // 赋值床号，列号
                        d_prodcut = sortedGroupList[k].slice(0, heightList[k] * j).map((e, index) => {
                            e.bedIndex = bedIndex
                            e.rowIndex = rowNum + Math.ceil((index + 1) / j) - 1
                            e.materialCode = materialCode
                            return e
                        })
                        rowNum += heightList[k]
                    } else {
                        // 赋值床号，列号
                        d_prodcut = sortedGroupList[k].slice(0, (maxNum - rowNum) * j).map((e, index) => {
                            e.bedIndex = bedIndex
                            e.rowIndex = rowNum + Math.ceil((index + 1) / j) - 1
                            e.materialCode = materialCode
                            return e
                        })
                        rowNum = maxNum
                    }
                    // 修改groupMap
                    groupMap[d_prodcut[0].groupUnicId] = groupMap[d_prodcut[0].groupUnicId].filter(e => !d_prodcut.some(sub => sub.uuid === e.uuid))
                    // 数量到达最大列数跳出
                    if (rowNum === maxNum) {
                        break
                    }
                }
                // 不用降低层数，直接分新床
                break
            }
        }
        // -------------------人工------------------
        else {
            // 人工不用降层 默认使用最大层高 不用管奇偶限制
            let heightList = sortedGroupList.map(e => {
                return {
                    rowNum: Math.floor(e.length / maxLevel),
                    left: e.length % maxLevel,
                    groupUnicId: e[0].groupUnicId,
                    //length: e.length,
                    //maxLevel
                }
            })
            console.log("heightList", heightList)
            // 循环数组，成列的衔接剩余，剩余由大到小排序 
            let finalRowList = heightList.filter(e => e.rowNum > 0).map(e => ({
                rowNum: e.rowNum,
                groupUnicId: e.groupUnicId
            }))
            finalRowList = finalRowList.concat(heightList.filter(e => e.left > 0).map(e => ({
                left: e.left,
                groupUnicId: e.groupUnicId
            })).sort((pre, next) => next.left - pre.left))
            // 已经占用列数
            //console.log("finalRowList", finalRowList)
            let rowNum = 0
            for (let j = 0; j < finalRowList.length; j++) {
                let d_prodcut
                if (finalRowList[j].rowNum > 0 && maxNum - rowNum >= finalRowList[j].rowNum) {
                    d_prodcut = sortedGroupList.find(e => e[0].groupUnicId === finalRowList[j].groupUnicId).slice(0, finalRowList[j].rowNum * maxLevel).map((e, index) => {
                        e.bedIndex = bedIndex
                        e.rowIndex = rowNum + Math.ceil((index + 1) / maxLevel) - 1
                        e.materialCode = materialCode
                        return e
                    })
                    rowNum += finalRowList[j].rowNum
                } else if (finalRowList[j].rowNum > 0 && maxNum - rowNum < finalRowList[j].rowNum) {
                    d_prodcut = sortedGroupList.find(e => e[0].groupUnicId === finalRowList[j].groupUnicId).slice(0, (maxNum - rowNum) * maxLevel).map((e, index) => {
                        e.bedIndex = bedIndex
                        e.rowIndex = rowNum + Math.ceil((index + 1) / maxLevel) - 1
                        e.materialCode = materialCode
                        return e
                    })
                    rowNum = maxNum
                } else if (finalRowList[j].left > 0) {
                    let arr = sortedGroupList.find(e => e[0].groupUnicId === finalRowList[j].groupUnicId)
                    // 成列的已经被排了
                    d_prodcut = arr.slice(arr.length - finalRowList[j].left).map((e, index) => {
                        e.bedIndex = bedIndex
                        e.rowIndex = rowNum + Math.ceil((index + 1) / maxLevel) - 1
                        e.materialCode = materialCode
                        return e
                    })
                    rowNum++
                }
                // 修改groupMap
                groupMap[d_prodcut[0].groupUnicId] = groupMap[d_prodcut[0].groupUnicId].filter(e => !d_prodcut.some(sub => sub.uuid === e.uuid))
                // 数量到达最大列数跳出
                if (rowNum === maxNum) {
                    break
                }
            }
        }
        bedIndex++
    }
    bedConfig[i].result = product.map(e => ({
        uuid: e.uuid,
        数据ID: e.数据ID,
        bedIndex: e.bedIndex,
        rowIndex: e.rowIndex
    }))
}

return { result: bedConfig, product }