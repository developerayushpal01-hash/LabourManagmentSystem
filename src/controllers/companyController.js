const Company = require("../models/Company");

const getCompanyProfile = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company profile fetched successfully",
      company,
    });
  } catch (error) {
    console.log("Get Company Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateCompanyProfile = async (req, res) => {
  try {
    const { companyName, ownerName, email, mobile, gstNumber, address } = req.body;

    const company = await Company.findById(req.user.companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (companyName) company.companyName = companyName;
    if (ownerName) company.ownerName = ownerName;
    if (email) company.email = email;
    if (mobile) company.mobile = mobile;
    if (gstNumber) company.gstNumber = gstNumber;

    if (address) {
      company.address = {
        street: address.street || company.address?.street,
        city: address.city || company.address?.city,
        state: address.state || company.address?.state,
        pincode: address.pincode || company.address?.pincode,
        country: address.country || company.address?.country || "India",
      };
    }

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      company,
    });
  } catch (error) {
    console.log("Update Company Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
};