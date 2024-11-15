// function colorConfirm(factories, productionOrders, styles, products, inventoryData) {
function a() {
    let confirmedProducts = [], confirmedProductionOrders = [];
    let _inventoryData = [];

    // 处理库存信息，按厂区、编码、色差档合并
    for (let item of inventoryData) {
        let i = _inventoryData.findIndex(i => i.FMaterialNumber == item.FMaterialNumber && i.FOrgNumber == item.FOrgNumber && i.FColorDiffRange == item.FColorDiffRange);
        if (i == -1) {
            _inventoryData.push(item);
        } else {
            _inventoryData[i].FCanDivBatches += item.FCanDivBatches;
        }
    }
    inventoryData = _inventoryData;

    let materials = [], tempIds = [];
    // 合并生产单，同交期同主面料同合同的合并
    for (let productionOrder of productionOrders) {
        if (!tempIds.includes(productionOrder['数据ID'])) {
            let styleInfo = styles.find(i => i.code == productionOrder.styleCode) || {};
            let unitInfo = (styleInfo.amountList || []).find(i => i.code == styleInfo.main);
            if (unitInfo && unitInfo.amount) {
                let arr = productionOrders.filter(i => i.deliveryDate == productionOrder.deliveryDate &&
                    (styles.find(j => j.code == i.styleCode) || {}).main == unitInfo.code &&
                    i.orderId == productionOrder.orderId);
                let _item = { code: unitInfo.code, productionDemands: [] };
                arr.forEach(i => {
                    tempIds.push(i['数据ID']);
                    let styleInfo = styles.find(j => j.code == i.styleCode) || {};
                    let unitInfo = (styleInfo.amountList || []).find(j => j.code == styleInfo.main);
                    let j = _item.productionDemands.findIndex(j => j.factoryId == i.dept_id);
                    if (j == -1) {
                        let productionOrderUnitCostMap = {}, productionOrderConfirmedMap = {};
                        productionOrderUnitCostMap[i['数据ID']] = unitInfo.amount;
                        productionOrderConfirmedMap[i['数据ID']] = {};
                        _item.productionDemands.push({
                            factoryId: i.dept_id,
                            factoryCode: factories.find(j => j.id == i.dept_id).code,
                            total: (i.totalNum - i.reserveNum) * unitInfo.amount,
                            productionOrderIds: [i['数据ID']],
                            productionOrderConfirmedMap,
                            productionOrderUnitCostMap
                        });
                    } else {
                        _item.productionDemands[j].total += (i.totalNum - i.reserveNum) * unitInfo.amount;
                        _item.productionDemands[j].productionOrderIds.push(i['数据ID']);
                        _item.productionDemands[j].productionOrderConfirmedMap[i['数据ID']] = {};
                        _item.productionDemands[j].productionOrderUnitCostMap[i['数据ID']] = unitInfo.amount;
                    }
                });
                materials.push(_item);
            }
        }
    }

    // 遍历合并单
    for (let material of materials) {
        let _inventoryData = JSON.parse(JSON.stringify(inventoryData));
        let unable = false;
        let curInventory = inventoryData.filter(i => i.FMaterialNumber == material.code.replace(/\./g, ""));
        let curConfirmedProducts = [], curConfirmedProductionOrders = [];

        for (let item of material.productionDemands) {
            let inventory = curInventory.filter(i => i.FOrgNumber == item.factoryCode).sort((a, b) => a.FCanDivBatches - b.FCanDivBatches);

            if (item.total > inventory.reduce((total, cur) => total += cur.FCanDivBatches, 0)) {
                unable = true;
                break;
            }

            let itemProducts = products.filter(i => item.productionOrderIds.includes(i.productionOrderId));

            function confirmation(filterField) {
                let selections = [...new Set(itemProducts.map(i => {
                    switch (filterField) {
                        case 'departmentId': return i.departmentId;
                        case 'department_sex': return { deptId: i.departmentId, sex: i.sex };
                        case 'memberId': return i.memberId;
                    }
                }))];

                let schemes = [];

                function exclusion(scheme, options) {
                    if (!options.length) {
                        schemes.push(JSON.parse(JSON.stringify(scheme)));
                        return;
                    }

                    const excludedSet = new Set(scheme.excluded);
                    for (let option of options) {
                        if (excludedSet.has(option)) continue;

                        scheme.excluded.push(option);
                        let _itemProducts = itemProducts.filter(i => {
                            switch (filterField) {
                                case 'departmentId': return i.departmentId === option;
                                case 'department_sex': return i.departmentId === option.deptId && i.sex === option.sex;
                                case 'memberId': return i.memberId === option;
                                default: return false;
                            }
                        });

                        let demands = _itemProducts.reduce((total, i) => total + item.productionOrderUnitCostMap[i.productionOrderId], 0);
                        let inventoryInfo = inventory.find(i => i.FCanDivBatches >= demands);

                        if (inventoryInfo) {
                            scheme.confirmedProducts = _itemProducts;
                            scheme.inventoryInfo = inventoryInfo;
                            scheme.cost = demands;
                            schemes.push(JSON.parse(JSON.stringify(scheme)));
                            return; // 找到库存后直接返回
                        }

                        exclusion(scheme, options.filter(i => i !== option));
                        scheme.excluded.pop(); // 恢复方案
                    }
                }

                exclusion({ excluded: [], confirmedProducts: [], inventoryInfo: {}, cost: 0 }, selections);

                if (schemes.length > 0) {
                    let scheme = schemes[0]; // 选择第一个方案
                    let inventoryInfo = scheme.inventoryInfo;
                    scheme.confirmedProducts.forEach(i => {
                        item.productionOrderConfirmedMap[i.productionOrderId][inventoryInfo.FColorDiffRange] = item.productionOrderConfirmedMap[i.productionOrderId][inventoryInfo.FColorDiffRange] || 0;
                        item.productionOrderConfirmedMap[i.productionOrderId][inventoryInfo.FColorDiffRange]++;
                        curConfirmedProducts.push({ "数据ID": i['数据ID'], colorDiff: inventoryInfo.FColorDiffRange });
                    });
                    inventoryInfo.FCanDivBatches -= scheme.cost; // 更新库存
                }
            }

            // 按优先级进行确认
            if (itemProducts.length) {
                confirmation('departmentId');
            }
            if (itemProducts.length) {
                confirmation('department_sex');
            }
            if (itemProducts.length) {
                confirmation('memberId');
            }

            if (itemProducts.length) {
                unable = true;
                break;
            } else {
                item.productionOrderIds.forEach(i => {
                    let po = productionOrders.find(j => j["数据ID"] == i);
                    let materialList = po.materialList || [];
                    let main = materialList.find(i => i.code == material.code);
                    if (!main) {
                        unable = true;
                        return;
                    }
                    materialList = materialList.filter(i => i.code != material.code);
                    for (let k in item.productionOrderConfirmedMap[i]) {
                        let mainInfo = JSON.parse(JSON.stringify(main));
                        mainInfo.colorDiff = k;
                        mainInfo.productNum = item.productionOrderConfirmedMap[i][k];
                        materialList.push(mainInfo);
                    }
                    curConfirmedProductionOrders.push({ "数据ID": i, apsStatus: 2, orderId: po.orderId, code: po.code });
                });
            }
        }

        if (!unable) {
            confirmedProducts = confirmedProducts.concat(curConfirmedProducts);
            confirmedProductionOrders = confirmedProductionOrders.concat(curConfirmedProductionOrders);
        } else {
            inventoryData = _inventoryData; // 恢复库存数据
        }
    }

    return { confirmedProducts, confirmedProductionOrders };
}
