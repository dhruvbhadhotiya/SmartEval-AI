import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import examReducer from '../features/exams/examsSlice';
import notifReducer from '../features/notifications/notifSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exams: examReducer,
    notifications: notifReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
