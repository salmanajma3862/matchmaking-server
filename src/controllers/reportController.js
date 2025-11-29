import Report from '../models/Reports.js';

export const createReport = async (req, res) => {
    try {
        const { reportedUserId, reason, description } = req.body;
        const reporterId = req.user.userId;

        if (!reportedUserId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Reported user ID and reason are required'
            });
        }

        const report = new Report({
            reporter: reporterId,
            reportedUser: reportedUserId,
            reason,
            description
        });

        await report.save();

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            report
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting report',
            error: error.message
        });
    }
};
