const ExcelJS = require('exceljs')

let table

function initGbkTable() {
  // https://en.wikipedia.org/wiki/GBK_(character_encoding)#Encoding
  const ranges = [
    [0xA1, 0xA9, 0xA1, 0xFE],
    [0xB0, 0xF7, 0xA1, 0xFE],
    [0x81, 0xA0, 0x40, 0xFE],
    [0xAA, 0xFE, 0x40, 0xA0],
    [0xA8, 0xA9, 0x40, 0xA0],
    [0xAA, 0xAF, 0xA1, 0xFE],
    [0xF8, 0xFE, 0xA1, 0xFE],
    [0xA1, 0xA7, 0x40, 0xA0],
  ]
  const codes = new Uint16Array(23940)
  let i = 0

  for (const [b1Begin, b1End, b2Begin, b2End] of ranges) {
    for (let b2 = b2Begin; b2 <= b2End; b2++) {
      if (b2 !== 0x7F) {
        for (let b1 = b1Begin; b1 <= b1End; b1++) {
          codes[i++] = b2 << 8 | b1
        }
      }
    }
  }
  table = new Uint16Array(65536)
  table.fill(0xFFFF)

  const str = new TextDecoder('gbk').decode(codes)
  for (let i = 0; i < str.length; i++) {
    table[str.charCodeAt(i)] = codes[i]
  }
}


const NodeJsBufAlloc = typeof Buffer === 'function' && Buffer.allocUnsafe

const defaultOnAlloc = NodeJsBufAlloc
  ? (len) => NodeJsBufAlloc(len)
  : (len) => new Uint8Array(len)

const defaultOnError = () => 63   // '?'


function str2gbk(str, opt = {}) {
  if (!table) {
    initGbkTable()
  }
  const onAlloc = opt.onAlloc || defaultOnAlloc
  const onError = opt.onError || defaultOnError

  const buf = onAlloc(str.length * 2)
  let n = 0

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      buf[n++] = code
      continue
    }
    const gbk = table[code]

    if (gbk !== 0xFFFF) {
      buf[n++] = gbk
      buf[n++] = gbk >> 8
    } else if (code === 8364) {
      // 8364 == '€'.charCodeAt(0)
      // Code Page 936 has a single-byte euro sign at 0x80
      buf[n++] = 0x80
    } else {
      const ret = onError(i, str)
      if (ret === -1) {
        break
      }
      if (ret > 0xFF) {
        buf[n++] = ret
        buf[n++] = ret >> 8
      } else {
        buf[n++] = ret
      }
    }
  }
  return buf.subarray(0, n)
}

// -----------------------------------------
var workbook = new ExcelJS.Workbook();

console.log("debug workbook", workbook)
var options = {}

var sheet = workbook.addWorksheet("Sheet1", {});

var contentRows = [
  ["# this is an example file for MTM data import. It contains the"],
  ["# order the model and the sizecode table."],
  ["#####################################################################"],
  ["# first the definition of the order"],
  ["=:order              #Section for the order"],
  ["o:MXCD2B-TEST-4_21"],
  ["d:GIUSEPPE"],
  ["a:A"],
  ["l:L"],
  ["w:150"],
  ["m:MXCD2B-9982-A-test           #This customer specific model is entered below."],
  ["t:jacket          #alterations are standard. name of preentered library."],
  ["z:test            #This customer specific sizecode is entered below."],
  ["q:1                  #Ordered 1 size 44 made to measure.(see sizecode)."],
  ["s:S1"],
  ["#####################################################################"],
  ["# definition of the model"],
  ["=:model              #Section for the model"],
  ["m:MXCD2B-9982-A-test"],
  ["c:customer is abc    #Comment."],
  ["p:MXCD2B-9982-38002_A型_后片-MXH-001"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_小片-MXX-001"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_挂面裁-MXG-009-"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_面支线-MXK-001-"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_袋盖裁-MXK-001-"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_领面裁（MXN-003）"],
  ["i:1"],
  ["p:MXCD2B-9982-38002_A型_领脚裁-MXR-001"],
  ["i:1"],
  ["p:MXCD2B-9982-38002_A型_大袖-MXA-001"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_小袖-MXL-001"],
  ["i:1"],
  ["x:1"],
  ["p:MXCD2B-9982-38002_A型_前片裁-MXQ-009"],
  ["i:1"],
  ["x:1"],
  ["#####################################################################"],
  ["# definition of the sizecode"],
  ["=:sizecode           #Section for the SizeCode."],
  ["s:test          "],
  ["a:76/110A       "],
  ["o:S1  "],
  ["r:衣长"],
  ["v:1.5"],
  ["r:肩宽"],
  ["v:2.5"],
  ["r:胸围"],
  ["v:-1.0"]
]

sheet.addRows(contentRows);

workbook.csv.writeBuffer().then((buffer) => {

  var blob = new Blob([buffer], { type: 'text/csv' })
  console.log("debug blob", buffer);
  blob.text().then((result) => {
    //  关键步骤，将文字result转换为GBK编码的buffer数据
    var crResult = result.replace(/\n/g, '\r\n');
    console.log("str", crResult)
    var gbkResult = str2gbk(crResult);
    console.log("debug gbkBuffer", gbkResult)
    //var decoder = new TextDecoder("gbk");
    //var decodeText = decoder.decode(gbkResult);
    //console.log("decodeText",decodeText);
    var gbkBlob = new Blob([gbkResult], { type: 'text/csv;charset=gbk' })
    // 将Blob对象的数据转换为ArrayBuffer
    gbkBlob.arrayBuffer().then(arrayBuffer => {
      // 将ArrayBuffer转换为Buffer对象
      const buffer = Buffer.from(arrayBuffer);

      // 将Buffer对象转换为Base64字符串
      const base64 = buffer.toString('base64');
      console.log("base64", base64);
    }).catch(error => {
      console.error("Error:", error);
    });
  })

}).catch((err) => {
  console.log("write err", err)
})
