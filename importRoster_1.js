function importRoster_1(data) {
    const existPersonalList = data.existPersonalList;
    let personalList = data.personalList;
    let cacheArr = data.cacheArr;
    const updatePersonalList = existPersonalList.map(i=>{let o = personalList.find(sub=>((i.phone && sub.phone===i.phone) || (i.memberId && sub.memberId+"" === i.memberId+"")));if(o) {o.oldData = true};return Object.assign(i, o)});
    const newPersonalList = personalList.filter(i => !i.oldData);
    cacheArr = cacheArr.map(i=>{i.userInfo = existPersonalList.find(sub=>(sub.phone && sub.phone===i.phone)||(sub.memberId && sub.memberId===i.memberId));i.memberId=i.userInfo?i.userInfo.memberId:i.memberId;return i});
    return {updatePersonalList, newPersonalList, cacheArr}
}
module.exports = importRoster_1