import { initializeModels } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

const models = initializeModels();
const { Note, NoteTag } = models;

export const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.findAll({ where: { userId: req.user.userId } });
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { subjectId, title, content, isPinned } = req.body;
    const note = await Note.create({
      userId: req.user.userId,
      subjectId,
      title,
      content,
      isPinned,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ where: { id, userId: req.user.userId } });
    if (!note) throw new ApiError(404, "Note not found");
    
    await note.update(req.body);
    res.json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ where: { id, userId: req.user.userId } });
    if (!note) throw new ApiError(404, "Note not found");

    await note.destroy();
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    next(error);
  }
};
