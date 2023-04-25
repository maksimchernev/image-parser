const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { writeFiles, wait, imageDataGenerator } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const baseLink = 'https://artelamp.ru/search/?query='

const parseItem = async(article, articuls, articulOnPage, itemLink) => {
  let arts = articuls
  let imagesData
  if (articuls.includes(articulOnPage)) {
    console.log("Запрос по Внутренней ссылке: " + itemLink);
    let responseSub = await axios.get(itemLink)
    let itemPage = responseSub.data; // Запись полученного результата
    const domSub = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const documentSub = domSub.window.document;
    let itemData = documentSub.getElementsByClassName('card_main')[0]
    let atrAnotherTry = itemData
        .getElementsByClassName('card_main_content')[0]
        .getElementsByClassName('card_main_content_unit')[0]
        .getElementsByClassName('card_main_content_unit_content')[0]
        .getElementsByClassName('card_main_content_unit_content_article')[0].innerHTML
    console.log('atrAnotherTry', atrAnotherTry) 
    if(atrAnotherTry && articuls.includes(atrAnotherTry)) {
      /* пути */
      console.log('found')
      let slider = itemData.getElementsByClassName('card_main_sliders')[0]
        .getElementsByClassName('card_main_sliders_left')[0]
        .getElementsByClassName('swiper-container')[0]
        .getElementsByClassName('swiper-wrapper')[0]
        .getElementsByClassName('swiper-slide')
      const imgUrlsForWP = []

      for (let i = 0; i<slider.length; i++) {
          let url = slider[i].getElementsByTagName('img')[0].getAttribute("src")
          let urlAbs = url.replace("/", "https://artelamp.ru/");
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

const parseArtelamp = async(articulsToBeFound) => {
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
    let links = document.getElementsByClassName("listing_content")[0]
        .getElementsByClassName('listing_content_catalog_units')[0]
    if (links) {
        links = links.getElementsByClassName("unit");
        let linksLength = links.length;
        console.log('linksLength', linksLength)
        // Перебор и запись всех статей на выбранной странице
        for (let i = 0; i < linksLength && !foundAll; i++) {
          let articulContainer = links[i].getElementsByClassName("element")[0].getElementsByClassName('the_content')[0].getElementsByClassName('article')[0].getElementsByTagName('a')
          let articulOnPage = articulContainer[articulContainer.length-1].innerHTML
          //let type = links[i].getElementsByClassName("ext")[0].getElementsByClassName("type")[0].getElementsByTagName('span')[0].innerHTML
          console.log('articulOnPage', articulOnPage)
          let relLink = articulContainer[articulContainer.length-1].getAttribute("href")
          // Превращение ссылок в абсолютные
          let itemLink = relLink.replace("/", "https://artelamp.ru/");
          let {imagesData, arts} = await parseItem(article, articuls, articulOnPage, itemLink)
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
/* const articulsToBeFound= ['A4631PL-1BK']
parseArtelamp(articulsToBeFound) */
module.exports = parseArtelamp