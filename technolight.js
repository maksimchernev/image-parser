const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { imageDataGenerator, wait, writeFiles } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const baseLink = 'https://technolight.ru/search?search='

const parseItem = async(article, articuls, title, itemLink) => {
  let arts = articuls
  let imagesData
  if (title.match(article)) {
    console.log("Запрос по Внутренней ссылке: " + itemLink);
    let responseSub = await axios.get(itemLink)
    let itemPage = responseSub.data; // Запись полученного результата
    const domSub = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const documentSub = domSub.window.document;
    let itemData = documentSub.getElementsByClassName('good_page')[0]
        .getElementsByClassName('container-fluid')[0]
        .getElementsByClassName('modal in modal_count')[0]
        .getElementsByClassName('spot_top')[0]
    let atrAnotherTry = itemData
        .getElementsByClassName('el el2')[0]
        .getElementsByClassName('title')[0].innerHTML
        /* .split(' ')[1] */
    console.log('atrAnotherTry', atrAnotherTry) 
    if(atrAnotherTry && atrAnotherTry.match(article)) {
      /* пути */
      console.log('found')
      let slider = itemData.getElementsByClassName('el el1')[0]
        .getElementsByClassName('img_wr')
      const imgUrlsForWP = []

      for (let i = 0; i<slider.length; i++) {
          let url = slider[i].getElementsByTagName('img')[0].getAttribute("src")
          let urlAbs = "https://technolight.ru/"+url
          imgUrlsForWP.push(urlAbs)
      }
      imagesData = imageDataGenerator((article).toString(), imgUrlsForWP)
      arts = arts.filter((articul)=> {
          return articul != article
      })
      console.log('arts', arts)
    }
  } 
  return {imagesData, arts}
}

const parseTechnolight = async(articulsToBeFound) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  for (let article of articulsToBeFound) {
    let link = baseLink+article; // Конструктор ссылки на страницу со статьями для запроса по не
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    let response = await axios.get(link)
    var currentPage = response.data; // Запись полученного результата
    const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
    let links = document.getElementsByClassName("result_search")[0]
        .getElementsByClassName('container-fluid')[0]
        .getElementsByClassName('result_search_list')[0]
        .getElementsByClassName('df')[0]
    if (links) {
        links = links.getElementsByClassName("element search");
        let linksLength = links.length;
        console.log('linksLength', linksLength)
        // Перебор и запись всех статей на выбранной странице
        for (let i = 0; i < linksLength && !foundAll; i++) {
          let title = links[i].getElementsByClassName("content")[0].getElementsByClassName('tit')[0].innerHTML
          //let type = links[i].getElementsByClassName("ext")[0].getElementsByClassName("type")[0].getElementsByTagName('span')[0].innerHTML
          console.log('title', title)
          let relLink = links[i].getElementsByTagName('a')[0].getAttribute("href")
          // Превращение ссылок в абсолютные
          let itemLink = "https://technolight.ru/" + relLink 
          let {imagesData, arts} = await parseItem(article, articuls, title, itemLink)
          console.log('imagesData', imagesData)
          imageDataArr = imageDataArr.concat(imagesData)
          articuls = arts
            console.log('imageDataArr', imageDataArr)
          if (articuls.length == 0) {
            foundAll = true
          }
          await wait(100)   
        }
    }
  }


  if (!articuls.length) {
    await writeFiles(imageDataArr)
    console.log("Все товары найдены, парсинг завершен.");
  } else if (articuls.length < articulsToBeFound.length){
    await writeFiles(imageDataArr)
    console.log('Не были найдены следующие артикулы: ', articuls);
  } else {
    console.log("Артикулы не найдены!");
  }
  foundAll = false
  page = 1
  pagesNumber = 1
  return (articuls)
}
/* const articulsToBeFound= ['86308-3K-04-BK']
parseTechnolight(articulsToBeFound) */
module.exports = parseTechnolight