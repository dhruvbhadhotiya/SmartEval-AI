import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import examReducer from '../features/exams/examsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exams: examReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
