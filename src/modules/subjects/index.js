export { default as subjectRoutes } from "./subject.routes.js";
export {
  assertOwned,
  create,
  getById,
  list,
  remove,
  update,
} from "./subject.service.js";
export { serializeSubject, serializeSubjectList } from "./subject.serializer.js";
