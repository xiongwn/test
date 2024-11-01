if (!colorDiff) {
  colorDiff = "";
}
let bedList = new Array(
  new Set(bedConfig.map((i) => i.result.map((sub) => sub.bedIndex)).flat()).size
).fill();
const mainBedIndexList = Array.from(
  new Set(bedConfig[0].result.map((i) => i.bedIndex))
);
if (product[0].serialNum) {
  serialNum = Math.min(...product.map((e) => e.serialNum)) - 1;
}
const staticSerialNum = serialNum

let result = [];
let productResult = [];
// 全局列号
let rowId = 0;
for (let i = 0; i < bedList.length; i++) {
  const currentBedIndex = i;
  let cacheBedConfig = bedConfig.find((e) =>
    e.result.some((sub) => sub.bedIndex === currentBedIndex)
  );
  let bedId = i + 1;
  let c_product = cacheBedConfig.result
    .filter((sub) => sub.bedIndex === currentBedIndex)
    .map((e) => {
      e.serialNum = serialNum++
      // if (serialNum + 1 - staticSerialNum <= product.length) {
      //   e.serialNum = serialNum++
      // }
      e.bedId = bedId;
      return Object.assign(
        product.find((item) => item.uuid === e.uuid),
        e
      );
    });
  let groupTag = cacheBedConfig.groupTag;
  let relateToMain = cacheBedConfig.relateToMain;
  let materialCode = cacheBedConfig.materialCode;
  let cutMethod = cacheBedConfig.cutMethod;
  let rowList = Array.from(new Set(c_product.map((e) => e.rowIndex)));
  let rowHeightList = rowList.map(
    (e) => c_product.filter((sub) => sub.rowIndex === e).length
  );
  for (let j = 0; j < rowList.length; j++) {
    rowId++;
    c_product
      .filter((e) => e.rowIndex === j)
      .forEach((e) => {
        e.rowId = rowId;
      });
  }
  if (mainBedIndexList.includes(currentBedIndex)) {
    productResult = productResult.concat(JSON.parse(JSON.stringify(c_product)));
  }
  // 按每列层高分散成多行数据
  let layerArr = Array.from(new Set(rowHeightList));
  for (let j = 0; j < layerArr.length; j++) {
    let index = rowHeightList.indexOf(layerArr[j]);
    let length = rowHeightList.filter((e) => e === layerArr[j]).length;
    let layerNum = layerArr[j];
    let d_product = c_product.filter(
      (e) => e.rowIndex >= index && e.rowIndex < index + length
    );

    let uuids = d_product.map((e) => e.uuid);
    let styleIngredientTypeStr = styleIngredient
      .filter((e) => d_product.some((sub) => sub.styleId === e.styleId))
      .map((e) => e.type)
      .join("");
    // csv文件的ordername
    let orderName =
      orderNameCode +
      "-" +
      productionOrderId +
      "-" +
      bedId +
      "-" +
      styleIngredientTypeStr +
      "-" +
      materialCode;
    // 列数=衣服数量/层数
    let rowNum = uuids.length / layerNum;
    // 裁片用料调整
    let c_materialConfig = materialConfig.filter(
      (e) =>
        e.groupTag === groupTag &&
        e.origin === 1 &&
        e.materialCode === materialCode
    );
    // c_materialConfig相同的款式配料名称的amount的总和
    let c_styleIngredient = styleIngredient.filter((e) =>
      c_materialConfig.some(
        (sub) =>
          sub.styleIngredientName === e.name &&
          e.origin === 1 &&
          e.code === sub.materialCode
      )
    );
    // 每件衣服的裁片数
    let singlePeiceNum = c_styleIngredient.reduce(
      (pre, next) => pre + next.amount,
      0
    );
    // 裁片数量=列数*每件衣服的裁片数
    let peiceNum = rowNum * singlePeiceNum;
    let shrink = (c_materialConfig.find((e) => e.shrink) || {}).shrink;
    // 刀口数
    let Marker_Notches =
      c_styleIngredient
        .filter((e) => e.notches && e.amount)
        .reduce((pre, next) => pre + next.netches * next.amount, 0) * rowNum;
    // 单层周长
    let mMarker_Total_Perim =
      c_styleIngredient
        .filter((e) => e.perim && e.amount)
        .reduce((pre, next) => pre + next.perim * next.amount, 0) * rowNum;
    let obj = {
      bedId,
      materialCode,
      productionOrderId,
      groupTag,
      relateToMain,
      layerNum,
      uuids,
      type,
      status: 1, // 状态 2等待人工分床 1正常
      bed: category.bed,
      orderName,
      peiceNum,
      shrink,
      Marker_Notches,
      mMarker_Total_Perim,
      d_product: JSON.parse(JSON.stringify(d_product)),
    };
    if (colorDiff && mainBedIndexList.includes(currentBedIndex)) {
      obj.colorDiff = d_product[0].colorDiff;
    }
    //console.log("obj", obj)
    result.push(obj);
  }
}
// ---------------------
// 新处理床号，不同物料床号都从1开始
let materialCodeList = Array.from(new Set(result.map((i) => i.materialCode)));
//console.log("materialCodeList", materialCodeList)
for (let k = 0; k < materialCodeList.length; k++) {
  let currentMaterialCode = materialCodeList[k];
  //console.log("currentMaterialCode", currentMaterialCode)
  let arr = result
    .filter((i) => i.materialCode === currentMaterialCode)
    .sort((pre, next) => pre.bedId - next.bedId);
  arr.forEach((item, index) => {
    item.bedId = index + 1;
    item.d_product = item.uuids.map((sub) => {
      let o = item.d_product.find((i) => i.uuid === sub);
      o.bedId = item.bedId;
      return o;
    });
  });
}
let c_product = result.map((i) => i.d_product).flat();
product.forEach((item) => {
  item.bedId = c_product.find((sub) => sub.uuid === item.uuid).bedId;
});
// ---------------------
return { result, product, productResult };
//console.log({result, product, productResult})
