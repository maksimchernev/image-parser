const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { imageDataGenerator, wait, writeFiles } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const baseLink =
  "https://maytoni.ru/search/?q="; // Типовая ссылка на страницу со статьями (без номера в конце)

const parseMaytoniRu= async(articulsToBeFound) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  for (let articul of articulsToBeFound) {
    let link = baseLink + articul; // Конструктор ссылки на страницу со статьями для запроса по не
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    let response = await axios.get(link)
    var currentPage = response.data; // Запись полученного результата
    const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
    let linksLength = document.getElementsByClassName("catalog__list")[0].getElementsByClassName("catalog__item").length;
    console.log('linksLength', linksLength)
    // Перебор и запись всех статей на выбранной странице
    for (let i = 0; i < linksLength && !foundAll; i++) {
      let articulOnPage = document.getElementsByClassName("catalog__list")[0].getElementsByClassName("catalog__item")[i].getElementsByClassName("catalog-card")[0].getElementsByClassName("catalog-card__img")[0].getElementsByClassName("catalog-card__colors")[0]
      if (articulOnPage.getElementsByClassName("catalog-card__colors-item")[0]) {
        articulOnPage = articulOnPage.getElementsByClassName("catalog-card__colors-item")[0].getAttribute("data-copy")
      } else if (articulOnPage.getElementsByClassName("catalog-card__article")[0]){
        articulOnPage = articulOnPage.getElementsByClassName("catalog-card__article")[0].getAttribute("data-copy")
      } else {
        articulOnPage = null
      }
      console.log('articulOnPage', articulOnPage)
      let relLink = document.getElementsByClassName("catalog__list")[0].getElementsByClassName("catalog__item")[i].getElementsByClassName("catalog-card")[0].getElementsByClassName("catalog-card__link")[0].getAttribute("href")
      // Превращение ссылок в абсолютные
      let itemLink = relLink.replace("/", "https://maytoni.ru/");
      let relLinkArray = relLink.split('/')
      let relLinkArticul = relLinkArray[relLinkArray.length-2].toUpperCase()
      console.log('relLinkArticul', relLinkArticul)
      if (articuls.includes(articulOnPage) || !articulOnPage || articuls.includes(relLinkArticul)) {
        
        console.log("Запрос по Внутренней ссылке: " + itemLink);
        let responseSub = await axios.get(itemLink)
        let itemPage = responseSub.data; // Запись полученного результата
        const domSub = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
  
        const documentSub = domSub.window.document;
        let atrAnotherTry = documentSub.getElementsByClassName('product-card__code-code')[0].getElementsByClassName('input')[0].innerHTML
        console.log('atrAnotherTry', atrAnotherTry) 
        console.log(articuls.includes(relLinkArticul))
        if((atrAnotherTry && articuls.includes(atrAnotherTry)) || articuls.includes(articulOnPage) || articuls.includes(relLinkArticul)) {
          /* пути */
          console.log('found')
          let slider = documentSub.getElementsByClassName('product-card__img')[0].getElementsByClassName('product-card__slider')
          const imgUrlsForWP = []
          if (slider.length > 0) {
            slider = slider[0].getElementsByClassName('swiper-wrapper')[0].getElementsByClassName('swiper-slide')  
            for (let i = 0; i<slider.length; i++) {
              let url = slider[i].getElementsByClassName('product-card__slider-item')[0].getElementsByTagName('img')[0].getAttribute("src")
              let urlAbs = url.replace("/", "https://maytoni.ru/");
              imgUrlsForWP.push(urlAbs)
            }
          } else {
            const url = documentSub.getElementsByClassName('product-card__img')[0].getElementsByClassName('product-card__img-img')[0].getElementsByTagName('img')[0].getAttribute("src")
            let urlAbs = url.replace("/", "https://maytoni.ru/");
              imgUrlsForWP.push(urlAbs)
          }
          let imageData
          imageData = imageDataGenerator((atrAnotherTry).toString(), imgUrlsForWP)
          imageDataArr.push(imageData)
    
          articuls = articuls.filter((articul)=> {
              return articul != atrAnotherTry
          })
          console.log('articuls', articuls)
        }
      }
      if (articuls.length == 0) {
        foundAll = true
      }
      await wait(100)   
    }
    await wait(1000)   
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
/* const articulsToBeFound= ['TR030-4-12W3K-WW-DS-B', 'TR030-2-12W4K-B']
parseMaytoniRu(articulsToBeFound) */

module.exports = parseMaytoniRu