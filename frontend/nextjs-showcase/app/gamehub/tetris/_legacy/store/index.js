import { createStore } from 'redux';
import rootReducer from '../reducers';

const store = createStore(
  rootReducer,
  (typeof window !== 'undefined' && window.devToolsExtension) ? window.devToolsExtension() : undefined
);

export default store;
