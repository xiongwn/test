var group
//获取分组
group = Array.from(new Set(customOption.map(i=>i.extra.样板匹配分组).flat())).map(i=>({categoryId: i, customOption:customOption.filter(sub=>sub.extra.样板匹配分组.includes(i))}))
// console.log("group", group)
//分组赋予样板
group = group.map(i=>{i.templateList=templateList.filter(sub=>sub.categoryId===i.categoryId && i.customOption.map(e=>e.extra.样板匹配分组).flat().includes(sub.categoryId));return i})

//分组匹配
group.map(i=>{i.unionTemplate=i.templateList.find(e=>new Set(e.templateFormatDetail.map(sub=>sub.formatDetailItemId)).size===i.customOption.length && i.customOption.every(sub=>e.formatObj[sub.formatDetailId] && e.formatObj[sub.formatDetailId].includes(sub.value.formatDetailItemId)))})

if(group.some(i=>!i.unionTemplate)) {
  return {code:"step_2_1",reason:"样板不存在，无法形成3D模型",data:{group, }}
}

//克数范围
var groupTemplateList = group.map(i=>i.unionTemplate)
var templateCodes = groupTemplateList.map(i=>i.code).join(",")
var gramMax = groupTemplateList.reduce((pre,next)=>((next.gramMax && pre) ? Math.min(next.gramMax,pre) : (pre || next.gramMax)), null)
var gramMin = groupTemplateList.reduce((pre,next)=>((next.gramMin && pre) ? Math.max(next.gramMin,pre) : (pre || next.gramMin)), null)
if( gramMax && gramMin && gramMax < gramMin) {
  return {code:"step_2_2",reason:templateCodes+"每组克数范围不重合"}
}

//图片
var pictures = groupTemplateList.map(i => i.pictures).flat()

// 垂度
var sag = Array.from(new Set(groupTemplateList.map(i => i.sag).flat())).filter(i=>i)
if (sag && sag.length > 0) {
  for (let i = 0; i < groupTemplateList.length; i++) {
    if (groupTemplateList[i].sag && groupTemplateList[i].sag.length) {
      sag = sag.filter(sub => groupTemplateList[i].sag.includes(sub))
      if (sag.length === 0) {
        return {code:"step_2_6",reason:templateCodes+"每组垂度范围不重合"}
      }
    }
  }
}

// 弹性
var elasticity = Array.from(new Set(groupTemplateList.map(i => i.elasticity).flat())).filter(i=>i)
if (elasticity && elasticity.length > 0) {
  for (let i = 0; i < groupTemplateList.length; i++) {
    if (groupTemplateList[i].elasticity && groupTemplateList[i].elasticity.length) {
      elasticity = elasticity.filter(sub => groupTemplateList[i].elasticity.includes(sub))
      if (elasticity.length === 0) {
        return {code:"step_2_7",reason:templateCodes+"每组弹性范围不重合"}
      }
    }
  }
}

// 复合类型
var elasticity = Array.from(new Set(groupTemplateList.map(i => i.elasticity).flat())).filter(i=>i)
if (elasticity && elasticity.length > 0) {
  for (let i = 0; i < groupTemplateList.length; i++) {
    if (groupTemplateList[i].elasticity && groupTemplateList[i].elasticity.length) {
      elasticity = elasticity.filter(sub => groupTemplateList[i].elasticity.includes(sub))
      if (elasticity.length === 0) {
        return {code:"step_2_8",reason:templateCodes+"每组复合类型范围不重合"}
      }
    }
  }
}

// 织法(该字段弃用)
/*
var weaving = Array.from(new Set(groupTemplateList.map(i => i.weaving).flat())).filter(i=>i)
if (weaving && weaving.length > 0) {
  for (let i = 0; i < groupTemplateList.length; i++) {
    if (groupTemplateList[i].weaving && groupTemplateList[i].weaving.length) {
      weaving = weaving.filter(i => groupTemplateList[i].weaving.includes(i))
      if (weaving.length === 0) {
        return {code:"step_2_3",reason:templateCodes+"每组编织范围不重合"}
      }
    }
  }
}
*/

//纹理
var texture = Array.from(new Set(groupTemplateList.map(i => i.texture).flat())).filter(i=>i)
if (texture && texture.length > 0) {
  for (let i = 0; i < groupTemplateList.length; i++) {
    if (groupTemplateList[i].texture && groupTemplateList[i].texture.length) {
      texture = texture.filter(sub => groupTemplateList[i].texture.includes(sub))
      if (texture.length === 0) {
        return {code:"step_2_4",reason:templateCodes+"每组纹理范围不重合"}
      }
    }
  }
}

//主要规格第一行
//console.log("groupTemplateList", groupTemplateList)
if (groupTemplateList.some(i => !i.templateCraft || !i.templateCraft.data || !i.templateCraft.data.length) || new Set(groupTemplateList.map(i=>Object.entries(i.templateCraft.data[0]).filter(sub=>sub[0].includes("value")||sub[0].includes("name")).map(sub=>sub[1]).sort().join(","))).size > 1) {
  return {code:"step_2_5",reason:templateCodes+"模板主要规格不匹配"}
}

// 版型细节是否存在同名不同值的选项
var formatObj = groupTemplateList.map(i => i.templateFormatDetail).flat().reduce((pre, next) => {if(!pre[next.index]){pre[next.index]=next.valueIndex}else if(pre[next.index] !== next.valueIndex) {Object.assign(pre,{code: "step_2_5", reason: templateCodes+"版型细节值不同"})};return pre},{})
if(formatObj.code) {
  return formatObj
}
  
//量体设置
var measureDetail = []
var cacheObj = {}
var allMeasureDetail = groupTemplateList.map(i => i.measureDetail).flat()

/*allMeasureDetail.forEach(i => {
  if(cacheObj[i.headerIndex]) {
    cacheObj[i.headerIndex] ++
  } else {
    cacheObj[i.headerIndex] = 1
  }
})

measureDetail = Object.entries(cacheObj).filter(i => i[1] === 1).map(i => allMeasureDetail.find(sub => sub.headerIndex === i[0]))
//合并重复行
mergeMeasureDetail = Object.entries(cacheObj).filter(i => i[1] > 1).map(i => i[0])
for(var i = 0; i < mergeMeasureDetail.length; i++) {
  var arr = allMeasureDetail.filter(e => e.headerIndex === mergeMeasureDetail[i])
  var allData = arr.map(e => e.data).flat()
  var dataMap = Array.from(new Set(allData.map(e => e.index)))
  var data = {}
  for (var j = 0; j < dataMap.length; j++) {
    var value = allData.find(e => e.index === dataMap[j]).value
    if (value.includes("-")) {
      var min = Math.max(...allData.filter(e => e.index === dataMap[j] && e.value).map(e => e.value.split("-")[0]))
      var max = Math.min(...allData.filter(e => e.index === dataMap[j] && e.value).map(e => e.value.split("-")[1]))
      if (max >= min) {
        data[dataMap[j]] = min + "-" + max
      } else {
        data[dataMap[j]] = null
      }
    } else if(value.includes("±")) {
      data[dataMap[j]] = "±" + Math.min(...allData.filter(e => e.index === dataMap[j] && e.value).map(e => e.value.slice(1)))
    } else {
      data[dataMap[j]] = "" + Math.min(...allData.filter(e => e.index === dataMap[j] && e.value).map(e => e.value))
    }
    if (data[dataMap[j]].includes("Infinity")) {
      data[dataMap[j]] = null
    }
  }
  measureDetail.push({headerIndex: i,data :Object.keys(data).map(e => ({index:e, value: data[e],name: allData.find(sub => sub.index === e).name}))})
}
*/

var template = {
  gramMax, 
  gramMin, 
  texture, 
 // weaving, 
  sag,
  pictures,
  elasticity,
  //compositeType,
  group: groupTemplateList.map(i=>i.code),
  type: 2,//样板组合
  approveStatus: 1, //已审核
  slabUserId: "system",
  slabDepartment: 0,
  templateIngredient: groupTemplateList.map(i=>i.templateIngredient).flat(),
  remember: groupTemplateList.some(i=>!i.remember) ? 0 : 1,
  push: groupTemplateList.some(i=>!i.push) ? 0 : 1,
  intelligent: groupTemplateList.some(i=>!i.intelligent) ? 0 : 1,
  piece: 1,
  specificationAuth: Array.from(new Set(groupTemplateList.map(i => i.specificationAuth).flat())),
  allMeasureDetail
  //measureDetail
} 

return {code:200,data:template}