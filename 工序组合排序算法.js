// let inputData = []
inputData = inputData.map(i => { i.unic = "" + i.processGroupIndex + i.workSite + i.processIndex; return i })
let result = []
let restArr = []
while (result.length < inputData.length) {
    // 当前剩余
    restArr = JSON.parse(JSON.stringify(inputData.filter(i => !result.some(sub => sub.unic === i.unic))))

    // 剩余组
    let restGroupArr = Array.from(new Set(restArr.map(i => i.processGroupIndex)))

    // 每个剩余组里processIndex最小的
    let restMinArr = restGroupArr.map(i => restArr.filter(sub => sub.processGroupIndex === i).sort((pre, next) => pre.processIndex - next.processIndex)[0])

    // 当前已排的最后一个
    let lastItem
    if (result.length) {
        lastItem = result.slice(-1)[0]
    }

    // 各组processIndex最小的里面找workSite最小的
    result.push(restMinArr.sort((pre, next) => pre.workSite - next.workSite)[0])
}
// console.log(result)

// 测试跑几轮
// let testArr = []
// let round = 0
// while (testArr.length < result.length) {
//     round++
//     restArr = JSON.parse(JSON.stringify(result.filter(i => !testArr.some(sub => sub.unic === i.unic))))
//     let lastWorkSite = restArr[0].workSite
//     for (let n = 0; n < restArr.length; n++) {
//         let currentWorkSite = restArr[n].workSite
//         if (currentWorkSite >= lastWorkSite) {
//             testArr.push(restArr[n])
//             lastWorkSite = restArr[n].workSite
//         }
//     }
// }
// console.log(round)