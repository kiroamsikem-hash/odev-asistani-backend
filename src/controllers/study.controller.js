const StudySession = require('../models/StudySession.model');

// @desc    Create study session
exports.createSession = async (req, res) => {
  try {
    const { subject, targetDate, dailyGoal, notes } = req.body;

    if (!subject || !targetDate || !dailyGoal) {
      return res.status(400).json({
        success: false,
        message: 'Konu, hedef tarih ve günlük hedef gereklidir'
      });
    }

    const session = await StudySession.create({
      userId: req.user.id,
      subject,
      targetDate,
      dailyGoal,
      notes
    });

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışma oturumu oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get active study sessions
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await StudySession.getActiveSessions(req.user.id);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışma oturumları alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Update study progress
exports.updateProgress = async (req, res) => {
  try {
    const { minutesStudied } = req.body;

    if (!minutesStudied || minutesStudied <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir çalışma süresi giriniz'
      });
    }

    const session = await StudySession.updateProgress(
      req.params.id,
      req.user.id,
      minutesStudied
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Çalışma oturumu bulunamadı'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İlerleme güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get today's study statistics
exports.getTodayStats = async (req, res) => {
  try {
    const stats = await StudySession.getTodayStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Delete study session
exports.deleteSession = async (req, res) => {
  try {
    const session = await StudySession.deleteById(req.params.id, req.user.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Çalışma oturumu bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Çalışma oturumu silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışma oturumu silinirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = exports;
