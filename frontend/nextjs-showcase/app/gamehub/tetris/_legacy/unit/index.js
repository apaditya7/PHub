import { blockType, StorageKey } from './const';
import { want } from './want';
export { want };

// Legacy Unit Index
export const hiddenProperty = (() => { // document[hiddenProperty] 可以判断页面是否失焦
  if (typeof document === 'undefined') {
    return false;
  }
  let names = [
    'hidden',
    'webkitHidden',
    'mozHidden',
    'msHidden',
  ];
  names = names.filter((e) => (e in document));
  return names.length > 0 ? names[0] : false;
})();

export const visibilityChangeEvent = (() => {
  if (!hiddenProperty) {
    return false;
  }
  return hiddenProperty.replace(/hidden/i, 'visibilitychange'); // 如果属性有前缀, 相应的事件也有前缀
})();

export const isFocus = () => {
  if (!hiddenProperty) { // 如果不存在该特性, 认为一直聚焦
    return true;
  }
  return !document[hiddenProperty];
};

export const getNextType = () => { // 随机获取下一个方块类型
  const len = blockType.length;
  return blockType[Math.floor(Math.random() * len)];
};

export const isClear = (matrix) => { // 是否达到消除状态
  const clearLines = [];
  matrix.forEach((m, k) => {
    if (m.every(n => !!n)) {
      clearLines.push(k);
    }
  });
  if (clearLines.length === 0) {
    return false;
  }
  return clearLines;
};

export const isOver = (matrix) => { // 游戏是否结束, 第一行落下方块为依据
  return matrix.get(0).some(n => !!n);
};

export const subscribeRecord = (store) => { // 将状态记录到 localStorage
  return store.subscribe(() => {
    let data = store.getState().toJS();
    if (data.lock) { // 当状态为锁定, 不记录
      return;
    }
    data = JSON.stringify(data);
    data = encodeURIComponent(data);
    if (typeof window !== 'undefined' && window.btoa) {
      data = btoa(data);
    }
    localStorage.setItem(StorageKey, data);
  });
};

export const isMobile = () => { // 判断是否为移动端
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const android = /Android (\d+\.\d+)/.test(ua);
  const iphone = ua.indexOf('iPhone') > -1;
  const ipod = ua.indexOf('iPod') > -1;
  const ipad = ua.indexOf('iPad') > -1;
  const nokiaN = ua.indexOf('NokiaN') > -1;
  return android || iphone || ipod || ipad || nokiaN;
};

export default {
  getNextType,
  want,
  isClear,
  isOver,
  subscribeRecord,
  isMobile,
  visibilityChangeEvent,
  isFocus,
};
