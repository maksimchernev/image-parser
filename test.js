let str ="https://wp.magneticlight.ru/wp-content/uploads/Светильник-MAG-ORIENT-SPOT-HANG-R45-12W-Day4000-(WH,-24-deg,-48V,-DALI)-(Arlight,-IP20-Металл,-3-года)(1).jpg"
let newStr = str.replace(/(\(|\)|,)/g, '')
console.log(newStr)