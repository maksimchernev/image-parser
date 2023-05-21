const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { imageDataGenerator, writeFiles, wait } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const baseLink = "https://6063-light.com/ru/search?q=";

const parseItem = async (articuls, articulOnPage, itemLink) => {
  let arts = articuls;
  let imagesData;
  console.log("www", articulOnPage.slice(1, articulOnPage.length));
  if (
    arts.includes(articulOnPage) ||
    arts.includes(articulOnPage.slice(1, articulOnPage.length))
  ) {
    console.log("Запрос по Внутренней ссылке: " + itemLink);
    let responseSub = await axios.get(itemLink);
    let itemPage = responseSub.data; // Запись полученного результата
    const domSub = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const documentSub = domSub.window.document;
    let itemData = documentSub
      .getElementById("catalog")
      .getElementsByClassName("lyW")[0]
      .getElementsByClassName("ly oh")[0]
      .getElementsByTagName("div")[0]
      .getElementsByClassName("oh")[0];
    let atrAnotherTry;
    let isSinglePhoto;
    if (itemData.getElementsByTagName("div")[0].getAttribute("id") !== "cl") {
      atrAnotherTry = itemData
        .getElementsByClassName("inf")[0]
        .getElementsByClassName("oh")[0]
        .getElementsByClassName("fl")[0]
        .getElementsByClassName("article")[0]
        .getElementsByTagName("small")[0].innerHTML;
      isSinglePhoto = true;
    } else {
      atrAnotherTry = documentSub
        .getElementById("cr")
        .getElementsByClassName("inf")[0]
        .getElementsByClassName("oh")[0]
        .getElementsByClassName("fl")[0]
        .getElementsByTagName("span")[0]
        .getElementsByTagName("small")[0].innerHTML;
      isSinglePhoto = false;
    }
    console.log("isSinglePhoto", isSinglePhoto);
    console.log("atrAnotherTry", atrAnotherTry);
    if (
      (atrAnotherTry && arts.includes(atrAnotherTry)) ||
      arts.includes(atrAnotherTry.slice(1, atrAnotherTry.length)) ||
      arts.includes(articulOnPage) ||
      arts.includes(articulOnPage.slice(1, articulOnPage.length))
    ) {
      /* пути */
      console.log("found");
      let mediaContainer = documentSub
        .getElementById("catalog")
        .getElementsByClassName("lyW")[0]
        .getElementsByClassName("ly oh")[0]
        .getElementsByTagName("div")[0]
        .getElementsByClassName("oh")[0];

      const imgUrlsForWP = [];
      if (isSinglePhoto) {
        mainPhoto = mediaContainer
          .getElementsByClassName("fl")[0]
          .getElementsByClassName("oh")[0]
          .getElementsByTagName("a")[0];
        let url = mainPhoto.getElementsByTagName("img")[0].getAttribute("src");
        let urlAbs = url.replace("/", "https://6063-light.com/");
        imgUrlsForWP.push(urlAbs);
      } else {
        slider = documentSub
          .getElementById("media")
          .getElementsByClassName("oh")[1]
          .getElementsByTagName("a");
        for (let i = 0; i < slider.length; i++) {
          let url = slider[i]
            .getElementsByTagName("img")[0]
            .getAttribute("src");
          let urlAbs = url.replace("/", "https://6063-light.com/");
          imgUrlsForWP.push(urlAbs);
        }
        let mainPhoto = documentSub
          .getElementById("media")
          .getElementsByClassName("oh")[0]
          .getElementsByTagName("a")[0];
        let url = mainPhoto.getElementsByTagName("img")[0].getAttribute("src");
        let urlAbs = url.replace("/", "https://6063-light.com/");
        imgUrlsForWP.push(urlAbs);
      }
      if (arts.includes(atrAnotherTry.slice(1, atrAnotherTry.length))) {
        imagesData = imageDataGenerator(
          atrAnotherTry.slice(1, atrAnotherTry.length).toString(),
          imgUrlsForWP
        );
        arts = arts.filter((articul) => {
          return articul != atrAnotherTry.slice(1, atrAnotherTry.length);
        });
        console.log("articuls", articuls);
      } else {
        imagesData = imageDataGenerator(atrAnotherTry.toString(), imgUrlsForWP);
        arts = arts.filter((articul) => {
          return articul != atrAnotherTry;
        });
        console.log("articuls", articuls);
      }
    }
  }
  return { imagesData, arts };
};

const parse6063 = async (articulsToBeFound) => {
  let articuls = articulsToBeFound;
  let imageDataArr = [];
  let foundAll = false;
  for (let article of articulsToBeFound) {
    let link = baseLink + article; // Конструктор ссылки на страницу со статьями для запроса по не
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    let response = await axios.get(link);
    var currentPage = response.data; // Запись полученного результата
    const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
    let links = document
      .getElementsByClassName("line oh results")[0]
      .getElementsByClassName("catalog_item");
    let linksLength = links.length;
    console.log("linksLength", linksLength);
    // Перебор и запись всех статей на выбранной странице
    for (let i = 0; i < linksLength && !foundAll; i++) {
      let articulOnPage = links[i]
        .getElementsByClassName("ext")[0]
        .getElementsByClassName("article")[0]
        .getElementsByTagName("span")[0].innerHTML;
      //let type = links[i].getElementsByClassName("ext")[0].getElementsByClassName("type")[0].getElementsByTagName('span')[0].innerHTML
      console.log("articulOnPage", articulOnPage);
      let relLink = links[i]
        .getElementsByClassName("oh rel")[0]
        .getElementsByClassName("cl fl")[0]
        .getElementsByTagName("a")[0]
        .getAttribute("href");
      // Превращение ссылок в абсолютные
      let itemLink = relLink.replace("/", "https://6063-light.com/");
      let { imagesData, arts } = await parseItem(
        articuls,
        articulOnPage,
        itemLink
      );
      imageDataArr = imageDataArr.concat(imagesData);
      articuls = arts;

      if (articuls.length == 0) {
        foundAll = true;
      }
      await wait(100);
    }
  }

  if (!articuls.length) {
    await writeFiles(imageDataArr);
    console.log("Все товары найдены, парсинг завершен.");
  } else if (articuls.length < articulsToBeFound.length) {
    await writeFiles(imageDataArr);
    console.log("Не были найдены следующие артикулы: ", articuls);
  } else {
    console.log("Артикулы не найдены!");
  }
  foundAll = false;
  page = 1;
  pagesNumber = 1;
  return articuls;
};
/* const articulsToBeFound= ['0631017']
parse6063(articulsToBeFound) */
module.exports = parse6063;
