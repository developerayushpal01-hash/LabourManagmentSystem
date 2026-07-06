const Labour = require("../models/Labour");
const Site = require("../models/Site");
const Attendance = require("../models/Attendance");
const LabourPayment = require("../models/LabourPayment");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR"
    ? user._id
    : user.parentUserId;
};

const contractorDashboard = async (req, res) => {
  try {

    const contractorId = getContractorId(req.user);

    const today = new Date();

    const startToday = new Date(today);
    startToday.setHours(0,0,0,0);

    const endToday = new Date(today);
    endToday.setHours(23,59,59,999);

    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    //------------------------------------
    // Total Labour
    //------------------------------------

    const totalLabour = await Labour.countDocuments({
      companyId:req.user.companyId,
      contractorId,
      isDeleted:false
    });

    //------------------------------------
    // Active Labour
    //------------------------------------

    const activeLabour = await Labour.countDocuments({
      companyId:req.user.companyId,
      contractorId,
      status:"ACTIVE",
      isDeleted:false
    });

    //------------------------------------
    // Active Sites
    //------------------------------------

    const activeSites = await Site.countDocuments({
      companyId:req.user.companyId,
      contractorId,
      status:"ACTIVE",
      isDeleted:false
    });

    //------------------------------------
    // Today's Attendance
    //------------------------------------

    const todayAttendance = await Attendance.find({
      companyId:req.user.companyId,
      contractorId,
      attendanceDate:{
        $gte:startToday,
        $lte:endToday
      },
      isDeleted:false
    });

    let todayPresent = 0;
    let todayAbsent = 0;
    let todayHalfDay = 0;

    todayAttendance.forEach(item=>{

      if(item.status==="PRESENT") todayPresent++;

      if(item.status==="ABSENT") todayAbsent++;

      if(item.status==="HALF_DAY") todayHalfDay++;

    });

    //------------------------------------
    // Payments
    //------------------------------------

    const payments = await LabourPayment.find({
      companyId:req.user.companyId,
      contractorId,
      month,
      year,
      isDeleted:false
    });

    let advance = 0;
    let salaryPaid = 0;
    let bonus = 0;
    let deduction = 0;

    payments.forEach(item=>{

      if(item.paymentType==="ADVANCE")
        advance += item.amount;

      if(item.paymentType==="SALARY")
        salaryPaid += item.amount;

      if(item.paymentType==="BONUS")
        bonus += item.amount;

      if(item.paymentType==="DEDUCTION")
        deduction += item.amount;

    });

    //------------------------------------
    // Salary Payable
    //------------------------------------

    const monthStart = new Date(year,month-1,1);
    const monthEnd = new Date(year,month,0,23,59,59);

    const attendance = await Attendance.find({

      companyId:req.user.companyId,
      contractorId,

      attendanceDate:{
        $gte:monthStart,
        $lte:monthEnd
      },

      isDeleted:false

    });

    let monthlyPayable = 0;

    attendance.forEach(item=>{

      if(item.status==="PRESENT")
        monthlyPayable += item.wageAtThatDay;

      if(item.status==="HALF_DAY")
        monthlyPayable += item.wageAtThatDay/2;

      monthlyPayable += item.overtimeAmount || 0;

    });

    const netPayable =
      monthlyPayable
      + bonus
      - advance
      - deduction;

    const pendingSalary =
      netPayable
      - salaryPaid;

    return res.status(200).json({

      success:true,

      data:{

        totalLabour,

        activeLabour,

        activeSites,

        todayPresent,

        todayAbsent,

        todayHalfDay,

        monthlyPayable,

        advance,

        bonus,

        deduction,

        salaryPaid,

        pendingSalary

      }

    });

  } catch (error) {

    return res.status(500).json({

      success:false,
      message:error.message

    });

  }
};

module.exports={
    contractorDashboard
};