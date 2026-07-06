const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePagination(query, defaults = { page: 1, limit: 50 }) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || defaults.page);
    const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit, 10) || defaults.limit));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

function paginationResponse(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

function isValidUUID(str) {
    return VALID_UUID.test(str);
}

module.exports = { parsePagination, paginationResponse, isValidUUID };
