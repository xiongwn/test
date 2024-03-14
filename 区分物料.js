for(let i = 0; i < measureBodyStyle.length; i++) {
  if (measureBodyStyle[i].styleOrigin === "style") {
    // 当前款式id
    let styleId = measureBodyStyle[i].styleId
    let styleOrigin = measureBodyStyle[i].styleOrigin
    
    // 不包括裁片列表，且是一级用料
    let subStyleIngredient = styleIngredient.filter(sub => sub.styleId === styleId && sub.origin !== 1 && !sub.parentLevelId)
    
    // 主面料
    let main = style.find(e => e.数据ID === styleId)
    // 撞色描述
    let deltaPieceList = subStyleIngredient.filter(e => e.code !== main && e.origin === 1)
    // 卡片
    let card = personalMeasureBodyStyle.filter(sub => sub.styleId === styleId && sub.styleOrigin === styleOrigin)
    
    // 该款式下生产衣服的总数量
    let total = card.reduce((pre, next) => pre + next.number, 0)
    
    // 合并同类项计算num
    /*measureBodyStyle[i].materialList = Array.from(new Set(subStyleIngredient.map(sub => sub.code))).map(sub => ({code: sub, unit: subStyleIngredient[0].unit, num: subStyleIngredient.reduce((pre, next) => pre + (next.amount || 0), 0)}))*/
    
    /* sizeIngredientData
    [ 
    {
      "data":[
                   {
                     "standard":"150/88B",
                     "size":"35B/150",
                     "assistAttributeId":"assistAttribute-1",
"assistAttributeIdName":""
                    }
                  ],
       "ingredientLevelOneId":1
    }
  ]
    */
    
    // 当前style的sizeIngredientData
    let sizeData = sizeIngredientData.filter(sub => sub.styleId === styleId)
    let materialList = []
    if (sizeData) {
      sizeData = sizeData[0].sizeIngredientData
      for (let j = 0; j < subStyleIngredient.length; j++) {
        // 款式配料用量
        let amount = subStyleIngredient[j].amount
        // 物料号
        let code = subStyleIngredient[j].code
        // 单位
        let unit = subStyleIngredient[j].unit
        
        // 当前款式配料的sizedata
        let cacheSizeData = sizeData.filter(sub => sub.ingredientLevelOneId + "" === subStyleIngredient[j].name).map(sub => sub.data).flat()
        // assistAttributeId-size字典
        let dict = {}
        let cCard = JSON.parse(JSON.stringify(card)).map(sub => {
          let cSizeData = cacheSizeData.find(e => e.standard === sub.standard && e.size === sub.size)
          if (cSizeData) {
            sub.assistAttributeId = cSizeData.assistAttributeId
            dict[cSizeData.assistAttributeId] = cSizeData.size
          }
          return sub
        })
        cCard = cCard.filter(sub => sub.assistAttributeId)
        let arr = Array.from(new Set(cCard.map(sub => sub.assistAttributeId)))
        arr = arr.map(sub => {
          let o = {};
          o.assistAttributeId = sub;
          o.size = dict[sub];
          let productNum = cCard.filter(e => e.assistAttributeId === sub).reduce((pre, next) => pre + next.number, 0);
          o.unit = unit;
          o.code = code;
          o.totalNum = totalNum;
          o.styleIngredientAmount = amount;
          o.description = cCard.find(e => e.assistAttributeId === sub).description
          return o
        })
        materialList = materialList.concat(arr)
      }
    } else {
      materialList = []
    }
    measureBodyStyle[i].materialList = materialList
  }
}
return {result: measureBodyStyle}