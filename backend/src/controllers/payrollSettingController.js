const PayrollSetting = require("../models/PayrollSetting");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const createOrUpdatePayrollSetting = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const {
      pfEmployeePercent,
      pfEmployerPercent,
      esicEmployeePercent,
      esicEmployerPercent,
      hraType,
      hraValue,
      otherAllowanceType,
      otherAllowanceValue,
      isPFEnabled,
      isESICEnabled,
      roundOffSalary,
      salaryCycle,
    } = req.body;

    const setting = await PayrollSetting.findOneAndUpdate(
      {
        companyId: req.user.companyId,
        contractorId,
      },
      {
        companyId: req.user.companyId,
        contractorId,

        pfEmployeePercent,
        pfEmployerPercent,
        esicEmployeePercent,
        esicEmployerPercent,

        hraType,
        hraValue,

        otherAllowanceType,
        otherAllowanceValue,

        isPFEnabled,
        isESICEnabled,
        roundOffSalary,
        salaryCycle,

        isDeleted: false,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Payroll setting saved successfully",
      data: setting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPayrollSetting = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    let setting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    if (!setting) {
      setting = await PayrollSetting.create({
        companyId: req.user.companyId,
        contractorId,
      });
    }

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePayrollSetting = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const setting = await PayrollSetting.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Payroll setting not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payroll setting updated successfully",
      data: setting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createOrUpdatePayrollSetting,
  getPayrollSetting,
  updatePayrollSetting,
};