const LabourPayment = require("../models/LabourPayment");
const Labour = require("../models/Labour");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const createLabourPayment = async (req, res) => {
  try {
    const {
      labourId,
      paymentDate,
      month,
      year,
      amount,
      paymentType,
      paymentMode,
      remarks,
    } = req.body;

    if (!labourId || !month || !year || !amount || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "Labour, month, year, amount and payment type are required",
      });
    }

    const allowedTypes = ["ADVANCE", "SALARY", "BONUS", "DEDUCTION", "INCENTIVE"];

    if (!allowedTypes.includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    const contractorId = getContractorId(req.user);

    const labour = await Labour.findOne({
      _id: labourId,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const payment = await LabourPayment.create({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      labourNameSnapshot: labour.name,
      labourCodeSnapshot: labour.labourCode,
      paymentDate,
      month,
      year,
      amount,
      paymentType,
      paymentMode,
      remarks,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Labour payment entry created successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLabourPayments = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    })
      .populate("labourId", "employeeCode name mobile")
      .populate("createdBy", "name role")
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentsByLabour = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      labourId: req.params.labourId,
      isDeleted: false,
    })
      .populate("labourId", "employeeCode name mobile")
      .populate("createdBy", "name role")
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLabourPayment = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const payment = await LabourPayment.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment entry updated successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLabourPayment = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const payment = await LabourPayment.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLabourPayment,
  getLabourPayments,
  getPaymentsByLabour,
  updateLabourPayment,
  deleteLabourPayment,
};

