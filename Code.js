function doGet() {
  var output = HtmlService.createTemplateFromFile('index').evaluate();
  
  // 核心修復：這行能解決手機畫面看起來「超小」的問題，強迫 1:1 比例顯示
  output.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  
  return output
    .setTitle('家事集點助手')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 取得統計、項目與紀錄
function getData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("紀錄表");
  var statSheet = ss.getSheetByName("統計");
  var itemSheet = ss.getSheetByName("項目清單");

  var stats = statSheet.getRange("B1:B4").getValues();
  var itemData = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 2).getValues();
  
  var logData = logSheet.getDataRange().getValues();
  var totalUsedQuota = Math.abs(stats[1][0]); 
  var logs = [];
  
  for (var i = 1; i < logData.length; i++) {
    var itemText = logData[i][1] || "";
    var gain = logData[i][2] || 0;
    var loss = logData[i][4] || 0;
    var isUsed = false;
    
    if (gain > 0) {
      if (totalUsedQuota >= gain) {
        isUsed = true;
        totalUsedQuota -= gain;
      } else {
        isUsed = false;
        totalUsedQuota = 0;
      }
    }
    
    logs.push({
      date: Utilities.formatDate(new Date(logData[i][0]), "GMT+8", "MM/dd HH:mm"),
      item: itemText,
      points: gain > 0 ? "+" + gain : "-" + loss,
      isUsed: isUsed,
      isSpend: loss > 0
    });
  }

  return {
    stats: { remain: stats[2][0], times: stats[3][0] },
    items: itemData.map(r => ({name: r[0], score: r[1]})),
    logs: logs.reverse()
  };
}

// 新增紀錄
function addRecord(selectedItems, spend) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("紀錄表");
  var itemSheet = ss.getSheetByName("項目清單");
  var date = new Date();
  
  if (spend > 0) {
    logSheet.appendRow([date, "兌換成功！已扣除 5 點", 0, "", spend]);
    return "兌換成功！已扣除 5 點";
  } else {
    var itemData = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 2).getValues();
    var scoreMap = {};
    itemData.forEach(r => scoreMap[r[0]] = r[1]);
    var totalScore = 0;
    selectedItems.forEach(name => { if (scoreMap[name]) totalScore += scoreMap[name]; });
    logSheet.appendRow([date, selectedItems.join(", "), totalScore, "", 0]);
    return "集點成功！獲得 " + totalScore + " 點";
  }
}