const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { writeFiles, attributesGenerator, imageDataGeneratorWithAttributes, wait } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)


/* выполнняет поиск по рядам таблицы */
function findAttributes(productProperties, attributeName, orAttrName = ''){
  let propertiesLength = productProperties.length
    for (let i = 0; i < propertiesLength; i++) {
        let condition = productProperties[i].getElementsByClassName('product__properties-td')[0].innerHTML 
        if (condition == attributeName || condition == orAttrName) {

            let atrValue = productProperties[i].getElementsByClassName('product__properties-td')[1].innerHTML
            return Number(atrValue.replace(',', '.').match(/(?<=^| )\d+(\.\d+)?(?=$| )/)[0])
        }
    }
}

const baseLink =
  "https://transistor.ru/catalog/svetodiodnye-svetilniki-100010/filter/t_96-is-flex-or-mag-25-or-mag-45-or-mag-orient-or-orient/apply/?PAGEN_1="; // Типовая ссылка на страницу со статьями (без номера в конце)
const endLink = "&SIZEN_1=10";
let page = 1; // Номер первой страницы для старта перехода по страницам с помощью пагинатора
let pagesNumber = 1


const parseTransistorRu= async(articulsToBeFound) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  while (!foundAll && page <= pagesNumber) {
    let link = baseLink + page + endLink; // Конструктор ссылки на страницу со статьями для запроса по ней
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    axios.get(link).then((response) => {
      var currentPage = response.data; // Запись полученного результата
      const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
      const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
      // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
      let linksLength = document.getElementsByClassName("catalog-section")[0].getElementsByClassName("card-item").length;
      if (pagesNumber == 1) {
        let liTag = document.getElementsByClassName('bx_pagination_page')[0].getElementsByTagName('li')
        let pagesNumberStr = liTag[liTag.length-2].getElementsByTagName('a')[0].innerHTML
        pagesNumber = parseInt(pagesNumberStr, 10)
      }
      
      // Перебор и запись всех статей на выбранной странице
      for (let i = 0; i < linksLength ; i++) {
        
        let articulOnPage = document.getElementsByClassName("catalog-section")[0].getElementsByClassName("card-item")[i].getElementsByClassName("card")[0].getElementsByClassName("card__content")[0].getElementsByClassName("card__article")[0].getElementsByTagName("a")[0].innerHTML;
        
        if (articuls.includes(articulOnPage)) {
          // Получение относительных ссылок на статьи (так в оригинале)
          let relLink = document.getElementsByClassName("catalog-section")[0].getElementsByClassName("card-item")[i].getElementsByClassName("card")[0].getElementsByClassName("card__img")[0].getElementsByTagName("a")[0].getAttribute("href");
          // Превращение ссылок в абсолютные
          let itemLink = relLink.replace("/", "https://transistor.ru/");
          axios.get(itemLink).then((response) => {
            /* пути */
            let itemPage = response.data; // Запись полученного результата
            const dom = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
            const document = dom.window.document;
            const slider = document.getElementsByClassName('product__wrapper')[0].getElementsByClassName('product__imgs')[0].getElementsByClassName('product__slider')[0].getElementsByClassName('product__slider-for')[0].getElementsByClassName('slide')
            //let itemName = document.getElementsByTagName('h1')[0].innerHTML.replace(/ /g, '-')
            const productContent = document.getElementsByClassName('product__content')[0]
            const productProperties = productContent.getElementsByClassName('product__properties')[0]
            const titles = productProperties.getElementsByClassName('product__properties-title')
            let indexOfSizesTable
            for (let i = 0; i<titles.length; i++)  {
              if (titles[i].innerHTML.slice(0, 8).toUpperCase() == 'ГАБАРИТЫ') {
                indexOfSizesTable = i
                break
              }
            }
            //console.log('itemLink', itemLink)        

            const imgUrlsForWP = []
            for (let i = 0; i<slider.length; i++) {
              let url = slider[i].getElementsByTagName("a")[0].getAttribute("href")
              let urlAbs = url.replace("/", "https://transistor.ru/");
              //downloadImage(urlAbs, `./images/${itemName}(${i+1}).${url.slice(url.indexOf('.')+1)}`).then(console.log).catch(console.error)
              imgUrlsForWP.push(urlAbs)//https://wp.magneticlight.ru/wp-content/uploads/${itemName.replace(/(\(|\)|,)/g, '')}${i+1}.jpg
            }
            let imageData
            let height,
                width,
                length
            if (indexOfSizesTable) {
              const productPropertiesSizes = productProperties.getElementsByClassName('product__properties-table')[indexOfSizesTable].getElementsByClassName('product__properties-row')
              length = attributesGenerator('Длина (mm)', findAttributes(productPropertiesSizes, 'Длина'))
              width = attributesGenerator('Ширина (mm)', findAttributes(productPropertiesSizes, 'Ширина', 'Диаметр'))
              height = attributesGenerator('Высота (mm)', findAttributes(productPropertiesSizes, 'Высота'))
            } else {
              length = attributesGenerator('Длина (mm)')
              width = attributesGenerator('Ширина (mm)')
              height = attributesGenerator('Высота (mm)')
            }
            imageData = imageDataGeneratorWithAttributes((articulOnPage).toString(), imgUrlsForWP,length, width, height)
            imageDataArr.push(imageData)

            articuls = articuls.filter((articul)=> {
              return articul != articulOnPage
            })
          });
        }
      }
    });
    page++; // Увеличение номера страницы для сбора данных, чтобы следующий запрос был на более старую страницу
    if (articuls.length == 0) {
      foundAll = true
    }
    await wait(2500)
    
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
/* const articulsToBeFound= ['035832','035833','035834','035835','035839','035841','035842','035843','037912']
parseTransistorRu(articulsToBeFound) */

module.exports = parseTransistorRu