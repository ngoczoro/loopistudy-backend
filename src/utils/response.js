import { PAGINATION } from "../config/constants.js";

export const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

export const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const buildSuccessResponse = (
  message,
  data = null,
  pagination = null,
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

export const buildErrorResponse = (message, errors = null) => {
  return {
    success: false,
    message,
    errors: errors || null,
  };
};
