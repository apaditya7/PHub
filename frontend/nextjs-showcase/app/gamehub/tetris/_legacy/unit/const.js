import { List } from 'immutable';
import i18n from '../i18n.json';

export const blockShape = {
  I: [
    [1, 1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
};

export const origin = {
  I: [[-1, 1], [1, -1]],
  L: [[0, 0]],
  J: [[0, 0]],
  Z: [[0, 0]],
  S: [[0, 0]],
  O: [[0, 0]],
  T: [[0, 0], [1, 0], [-1, 1], [0, -1]],
};

export const blockType = Object.keys(blockShape);

export const speeds = [800, 650, 500, 370, 250, 160];

export const delays = [50, 60, 70, 80, 90, 100];

export const fillLine = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export const blankLine = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const blankMatrix = (() => {
  const matrix = [];
  for (let i = 0; i < 20; i++) {
    matrix.push(List(blankLine));
  }
  return List(matrix);
})();

export const clearPoints = [100, 300, 700, 1500];

export const StorageKey = 'REACT_TETRIS';

export const lastRecord = (() => { // 上一把的状态
  if (typeof window === 'undefined') {
    return false;
  }
  let data = localStorage.getItem(StorageKey);
  if (!data) {
    return false;
  }
  try {
    if (window.btoa) {
      data = atob(data);
    }
    data = decodeURIComponent(data);
    data = JSON.parse(data);
  } catch (e) {
    if (window.console || window.console.error) {
      window.console.error('Error reading record:', e);
    }
    return false;
  }
  return data;
})();

export const maxPoint = 999999;

export const transform = (function () {
  if (typeof window === 'undefined') {
    return 'transform';
  }
  const trans = ['transform', 'webkitTransform', 'msTransform', 'mozTransform', 'oTransform'];
  const body = document.body;
  return trans.filter((e) => body.style[e] !== undefined)[0];
}());

export const eachLines = 20; // 每消除eachLines行, 增加速度

export const getParam = (param) => { // 获取浏览器参数
  if (typeof window === 'undefined') {
    return '';
  }
  const r = new RegExp(`\\?(?:.+&)?${param}=(.*?)(?:&.*)?$`);
  const m = window.location.toString().match(r);
  return m ? decodeURI(m[1]) : '';
};

export const lan = (() => {
  let l = getParam('lan').toLowerCase();
  l = i18n.lan.indexOf(l) === -1 ? i18n.default : l;
  return l;
})();

if (typeof document !== 'undefined') {
  document.title = i18n.data.title[lan];
}

const i18nData = i18n.data;
export { i18nData as i18n };
