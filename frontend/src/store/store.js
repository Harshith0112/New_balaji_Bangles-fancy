import { configureStore } from '@reduxjs/toolkit';
import siteDataReducer from './siteDataSlice';

export const store = configureStore({
  reducer: {
    siteData: siteDataReducer,
  },
});
