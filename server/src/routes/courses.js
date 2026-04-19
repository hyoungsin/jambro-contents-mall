const express = require('express');
const router = express.Router();

const coursesController = require('../controllers/coursesController');

// 강의 관리
router.post('/', coursesController.createCourse);
router.post('/register', coursesController.createCourse);

// 목록/단건은 공개 (원하면 requireAuth로 바꿀 수 있음)
router.get('/', coursesController.getCourses);
router.get('/:id', coursesController.getCourseById);

router.put('/:id', coursesController.updateCourse);
router.delete('/:id', coursesController.deleteCourse);

module.exports = router;

