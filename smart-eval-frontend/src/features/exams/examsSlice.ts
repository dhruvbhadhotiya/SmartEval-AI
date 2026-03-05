import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import examService, { Exam, CreateExamData } from '../../services/examService';

// Exams state interface
interface ExamsState {
  exams: Exam[];
  currentExam: Exam | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status?: string;
    sort?: string;
  };
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: ExamsState = {
  exams: [],
  currentExam: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchExams = createAsyncThunk(
  'exams/fetchExams',
  async (params: { page?: number; limit?: number; status?: string; sort?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await examService.getExams(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch exams');
    }
  }
);

export const fetchExamById = createAsyncThunk(
  'exams/fetchExamById',
  async (examId: string, { rejectWithValue }) => {
    try {
      const response = await examService.getExamById(examId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch exam');
    }
  }
);

export const createExam = createAsyncThunk(
  'exams/createExam',
  async (examData: CreateExamData, { rejectWithValue }) => {
    try {
      const response = await examService.createExam(examData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create exam');
    }
  }
);

export const updateExam = createAsyncThunk(
  'exams/updateExam',
  async ({ examId, data }: { examId: string; data: Partial<CreateExamData> }, { rejectWithValue }) => {
    try {
      const response = await examService.updateExam(examId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update exam');
    }
  }
);

export const deleteExam = createAsyncThunk(
  'exams/deleteExam',
  async (examId: string, { rejectWithValue }) => {
    try {
      await examService.deleteExam(examId);
      return examId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete exam');
    }
  }
);

export const updateExamStatus = createAsyncThunk(
  'exams/updateExamStatus',
  async ({ examId, status }: { examId: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await examService.updateExamStatus(examId, status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const uploadQuestionPaper = createAsyncThunk(
  'exams/uploadQuestionPaper',
  async ({ examId, file }: { examId: string; file: File }, { rejectWithValue }) => {
    try {
      const response = await examService.uploadQuestionPaper(examId, file);
      return response.data.exam;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload question paper');
    }
  }
);

export const uploadModelAnswer = createAsyncThunk(
  'exams/uploadModelAnswer',
  async ({ examId, file }: { examId: string; file: File }, { rejectWithValue }) => {
    try {
      const response = await examService.uploadModelAnswer(examId, file);
      return response.data.exam;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload model answer');
    }
  }
);

// Slice
const examsSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<{ status?: string; sort?: string }>) => {
      state.filters = action.payload;
    },
    clearCurrentExam: (state) => {
      state.currentExam = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch exams
    builder
      .addCase(fetchExams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.exams = action.payload.data;
        state.pagination = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch exam by ID
    builder
      .addCase(fetchExamById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExamById.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        state.currentExam = action.payload;
        state.error = null;
      })
      .addCase(fetchExamById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create exam
    builder
      .addCase(createExam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExam.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        state.exams.unshift(action.payload); // Add to beginning
        state.error = null;
      })
      .addCase(createExam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update exam
    builder
      .addCase(updateExam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateExam.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        const index = state.exams.findIndex((exam) => exam.id === action.payload.id);
        if (index !== -1) {
          state.exams[index] = action.payload;
        }
        if (state.currentExam?.id === action.payload.id) {
          state.currentExam = action.payload;
        }
        state.error = null;
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete exam
    builder
      .addCase(deleteExam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteExam.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.exams = state.exams.filter((exam) => exam.id !== action.payload);
        if (state.currentExam?.id === action.payload) {
          state.currentExam = null;
        }
        state.error = null;
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update exam status
    builder
      .addCase(updateExamStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateExamStatus.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        const index = state.exams.findIndex((exam) => exam.id === action.payload.id);
        if (index !== -1) {
          state.exams[index] = action.payload;
        }
        if (state.currentExam?.id === action.payload.id) {
          state.currentExam = action.payload;
        }
        state.error = null;
      })
      .addCase(updateExamStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload question paper
    builder
      .addCase(uploadQuestionPaper.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadQuestionPaper.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        const index = state.exams.findIndex((exam) => exam.id === action.payload.id);
        if (index !== -1) {
          state.exams[index] = action.payload;
        }
        if (state.currentExam?.id === action.payload.id) {
          state.currentExam = action.payload;
        }
        state.error = null;
      })
      .addCase(uploadQuestionPaper.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload model answer
    builder
      .addCase(uploadModelAnswer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadModelAnswer.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false;
        const index = state.exams.findIndex((exam) => exam.id === action.payload.id);
        if (index !== -1) {
          state.exams[index] = action.payload;
        }
        if (state.currentExam?.id === action.payload.id) {
          state.currentExam = action.payload;
        }
        state.error = null;
      })
      .addCase(uploadModelAnswer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearCurrentExam } = examsSlice.actions;
export default examsSlice.reducer;
