let header = ""
// #BatchTab:C:\USERROOT\BPRMTBL\ABA9
header += "#BatchTab:C:\\USERROOT\\BPRMTBL\\"
// style.code中间部分
header += style.code.split(".").slice(1, -1)
// 优先级1-4
header += 1
header += "\n"

// bed
let bed = style.amountList
let list = new Array(bed.length).fill().map(e => ({}))
//console.log("bed", bed)
//console.log("list", list)
// ------------loop------------
for (let i = 0; i < bed.length; i++) {
    // -----model-----
    /* model name套-${款式编码}-{当前床床号}-{用料类型}-{物料编码}
    一床上如果存在多个用料类型，字符串拼接在一起 */

    let model = "=:model\n"
    // 物料号
    let materialCode = bed[i].code
    // material 物料预设
    let materialCache = material.find(e => e.code === materialCode)
    if (!materialCache) {
        return {code: "material_err", reason: "物料有误：" + materialCode}
    }
    // 床号
    let bedCode = (i + 1 + "").padStart(3, "0")
    //console.log("bedCode", bedCode)
    // 用料类型
    let ingredientTypeStr = Array.from(new Set(styleIngredient.filter(e => e.code === materialCode).map(e => e.type))).join("")
    let m = "m:套-" + style.code.replace(/\./g, "") + "-" + bedCode + "-" + ingredientTypeStr + "-" + materialCode + "\n"
    model += m
    // 按name分组
    let groupNameList = styleIngredient.filter(e => e.code === materialCode && e.name.indexOf("对称片") === -1).map(e => e.name)
    for (let j = 0; j < groupNameList.length; j++) {
        // 裁片名称
        let p = "p:" + groupNameList[j] + "\n"
        // 本片
        let cache = styleIngredient.find(e => e.name === groupNameList[j])
        let num = "i:" + (cache ? cache.amount : 0) + "\n"
        // x对称
        let cacheX = styleIngredient.find(e => e.name.includes(groupNameList[j]) && e.name.match(/X对称$/gi))
        let x = "x:" + (cacheX ? cacheX.amount : 0) + "\n"
        // y对称
        let cacheY = styleIngredient.find(e => e.name.includes(groupNameList[j]) && e.name.match(/(?<!X)Y对称$/gi))
        let y = "y:" + (cacheY ? cacheY.amount : 0) + "\n"
        // xy对称
        let cacheXY = styleIngredient.find(e => e.name.includes(groupNameList[j]) && e.name.match(/XY对称$/gi))
        let r = "r:" + (cacheXY ? cacheXY.amount : 0) + "\n"
        // 标准洗烘缩率x
        let xs = "xs:" + (materialCache.shrink_x || 0) + "\n"
        // 标准洗烘缩率y
        let ys = "ys:" + (materialCache.shrink_y || 0) + "\n"
        // 方向设置
        let h = ""
        if (materialCache.param_1) {
            h = "S"
        } else if ([1, 3, 4].includes(materialCache.textureName) || materialCache.param_2) {
            if (category.bed.data.cutMethod === 1) { // 裁剪方式半件 1 整 2
                h = "S"
            } else {
                h = "N"
            }
        } else {
            if (category.bed.data.cutMethod === 1) { // 裁剪方式半件 1 整 2
                h = "A"
            } else {
                h = "N"
            }
        }
        h = "h:" + h + "\n"
        // 是否允许增片
        let a = "a:y\n"
        // 配料物料编码
        let f = "f:" + materialCode + "\n"
        model = model + p + num + x + y + r + xs + ys + h + a + f
    }

    // -------------order----------------
    let order = "=:order\n"
    // 名称 套-${款式编码}-{当前床床号}-{用料类型}-{物料编码}
    let o = "o:套-" + style.code.replace(/\./g, "") + "-" + bedCode + "-" + ingredientTypeStr + "-" + materialCode + "\n"
    // 排版备注
    let d = "d:null\n"
    // 门幅
    let w = "w:" + (materialCache.doorWidth || 0) + "\n"
    // 横向循环
    let x = "x:" + (materialCache.loop_x || 0) + "\n"
    // 横向移位量
    let f = "f:null\n"
    // 纵向循环
    let y = "y:" + (materialCache.loop_y || 0) + "\n"
    // 注解档案
    let a = "a:A\n"
    // 翻转要求
    let l = ""
    if (materialCache.param_1) {
        if (category.bed.data.cutMethod === 1) { // 裁剪方式半件 1 整 2
            l = "面对面拉布单方向允许上下翻转"
        } else {
            l = "不允许翻转"
        }
    } else if ([1, 3, 4].includes(materialCache.textureName) || materialCache.param_2) {
        if (category.bed.data.cutMethod === 1) { // 裁剪方式半件 1 整 2
            l = "一个尺码一个方向"
        } else {
            l = "面对面拉布一个尺码一个方向允许上下翻转"
        }
    } else {
        if (category.bed.data.cutMethod === 1) { // 裁剪方式半件 1 整 2
            l = "面对面拉布任意方向"
        } else {
            l = "180左右转"
        }
    }
    l = "l:" + l + "\n"
    let g = "g:p-notch\n"
    // 样片距离
    let b = "b:" + category.bed.data.distance + "\n"
    // 使用裁片缩率标记
    let p8 = "8:1\n"
    // 款式编码 同model的model_name
    m = m
    // 规格表
    let t = "t:" + specification.specificationName + "\n"
    // 尺码代号
    let z = ""
    // 配料物料号
    let p0 = "0:" + materialCode + "\n"

    // ------套裁分组------
    // 规格数据
    if (!specification.data) {
        return { code: "specification_err_1", reason: "无规格数据" }
    }
    let specificationData = (specification.data.groupA || []).concat(specification.data.groupB || []).concat(specification.data.groupC || [])
    // 有中间码的数据
    let specificationLine = specificationData.find(e => e.code)
    if (!specificationLine) {
        return { code: "specification_err_2", reason: "未设置中间码" }
    }
    // 中间码
    let code = specificationLine.code
    let [size, standard] = code.split("&")
    let codeIndex = specificationLine.data.findIndex(e => e.size === size && e.standard === standard)
    // 第一轮没有衣服，用的是中间码和中加码后一个
    let size1 = specificationLine.data[codeIndex + 1].size
    let standard1 = specificationLine.data[codeIndex + 1].standard

    let product = [
        { size, standard },
        { size, standard },
        { size: size1, standard: standard1 },
        { size: size1, standard: standard1 }
    ]
    product.forEach(e => e.sizeNum = e.size.replace(/[a-z]+\//ig, "."))
    // 整套直接循环
    let loopStr = ""
    if (category.bed.data.cutMethod === 2) {
        for (let j = 0; j < product.length; j++) {
            // 数量
            let q = "q:1\n"
            // 尺码 标准规格
            let s = "s:" + product[j].standard + "\n"
            loopStr += (q + s)
        }
    } else {
        // 半套分组循环，按套裁分组
        product.sort((pre, next) => next.sizeNum - pre.sizeNum)
        // 每个套裁的层数
        let levelNum = 2
        // 循环次数=套裁数量=衣服数量/层数
        let rowNum = product.length / levelNum
        for (let j = 0; j < rowNum; j++) {
            // 本组里的衣服
            let cacheProduct = product.slice(j * levelNum, (j + 1) * levelNum)
            loopStr += "2:H\n"
            // 循环组内衣服
            for (let k = 0; k < cacheProduct.length; k++) {
                // 数量
                let q = "q:1\n"
                // 尺码 标准规格
                let s = "s:" + cacheProduct[k].standard + "\n"
                loopStr += (q + s)
            }
            loopStr += "3:" + cacheProduct[0].standard + "\n"
        }
    }
    order = order + o + d + w + x + f + y + a + l + g + b + p8 + m + t + z + p0 + loopStr
    list[i].result = header + order + model
    console.log("result", list[i].result)
}

return { dataList: list }