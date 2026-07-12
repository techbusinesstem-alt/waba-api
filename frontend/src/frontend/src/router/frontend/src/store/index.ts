import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    // Apne slices yahan add karein (e.g., auth: authReducer)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
