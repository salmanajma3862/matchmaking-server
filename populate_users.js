console.log('🚀 Script started...');
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const sampleUsers = [
    {
        name: "Ayesha Khan",
        gender: "female",
        dob: new Date("1998-05-15"),
        bio: "Love traveling and reading.",
        height: 165,
        city: "Lahore",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "Masters in English",
        profession: "Teacher",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/women/1.jpg", isPrimary: true }],
        interests: ["Reading", "Traveling"],
        phone: "+923001234567",
        passwordHash: "hashedpassword123", // In real app this should be hashed
        intention: "marriage",
        readyForMarriageTimeframe: "note_sure"
    },
    {
        name: "Ali Raza",
        gender: "male",
        dob: new Date("1995-08-20"),
        bio: "Software engineer, tech enthusiast.",
        height: 178,
        city: "Karachi",
        country: "Pakistan",
        religion: "Islam",
        sect: "Shia",
        maritalStatus: "Single",
        education: "BS CS",
        profession: "Software Engineer",
        incomeRange: "100k-200k",
        photos: [{ url: "https://randomuser.me/api/portraits/men/1.jpg", isPrimary: true }],
        interests: ["Coding", "Gaming"],
        phone: "+923001234568",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "6_months"
    },
    {
        name: "Fatima Ahmed",
        gender: "female",
        dob: new Date("2000-01-10"),
        bio: "Medical student.",
        height: 160,
        city: "Islamabad",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "MBBS",
        profession: "Doctor",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/women/2.jpg", isPrimary: true }],
        interests: ["Medicine", "Volunteering"],
        phone: "+923001234569",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "1_year"
    },
    {
        name: "Bilal Sheikh",
        gender: "male",
        dob: new Date("1992-11-05"),
        bio: "Businessman looking for a partner.",
        height: 180,
        city: "Lahore",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Divorced",
        education: "MBA",
        profession: "Business",
        incomeRange: "200k+",
        photos: [{ url: "https://randomuser.me/api/portraits/men/2.jpg", isPrimary: true }],
        interests: ["Business", "Cars"],
        phone: "+923001234570",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "soon"
    },
    {
        name: "Zainab Bibi",
        gender: "female",
        dob: new Date("1997-03-25"),
        bio: "Artist and painter.",
        height: 162,
        city: "Multan",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "BFA",
        profession: "Artist",
        incomeRange: "Less than 50k",
        photos: [{ url: "https://randomuser.me/api/portraits/women/3.jpg", isPrimary: true }],
        interests: ["Art", "Painting"],
        phone: "+923001234571",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "not_sure"
    },
    {
        name: "Usman Tariq",
        gender: "male",
        dob: new Date("1994-07-12"),
        bio: "Banker.",
        height: 175,
        city: "Faisalabad",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "BBA",
        profession: "Banker",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/men/3.jpg", isPrimary: true }],
        interests: ["Finance", "Cricket"],
        phone: "+923001234572",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "6_months"
    },
    {
        name: "Sana Malik",
        gender: "female",
        dob: new Date("1999-09-30"),
        bio: "Chef.",
        height: 158,
        city: "Karachi",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "Culinary Arts",
        profession: "Chef",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/women/4.jpg", isPrimary: true }],
        interests: ["Cooking", "Food"],
        phone: "+923001234573",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "soon"
    },
    {
        name: "Omar Farooq",
        gender: "male",
        dob: new Date("1990-02-14"),
        bio: "Architect.",
        height: 182,
        city: "Islamabad",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "B.Arch",
        profession: "Architect",
        incomeRange: "100k-200k",
        photos: [{ url: "https://randomuser.me/api/portraits/men/4.jpg", isPrimary: true }],
        interests: ["Design", "Travel"],
        phone: "+923001234574",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "1_year"
    },
    {
        name: "Hina Altaf",
        gender: "female",
        dob: new Date("1996-12-01"),
        bio: "Content Writer.",
        height: 163,
        city: "Lahore",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "BS Mass Comm",
        profession: "Writer",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/women/5.jpg", isPrimary: true }],
        interests: ["Writing", "Reading"],
        phone: "+923001234575",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "soon"
    },
    {
        name: "Hamza Ali",
        gender: "male",
        dob: new Date("1993-06-18"),
        bio: "Fitness Trainer.",
        height: 185,
        city: "Karachi",
        country: "Pakistan",
        religion: "Islam",
        sect: "Sunni",
        maritalStatus: "Single",
        education: "Certification",
        profession: "Trainer",
        incomeRange: "50k-100k",
        photos: [{ url: "https://randomuser.me/api/portraits/men/5.jpg", isPrimary: true }],
        interests: ["Fitness", "Gym"],
        phone: "+923001234576",
        passwordHash: "hashedpassword123",
        intention: "marriage",
        readyForMarriageTimeframe: "soon"
    }
];

const populateUsers = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected successfully');

        console.log('🗑️ Clearing existing users (optional, comment out if not needed)...');
        // await User.deleteMany({}); // Uncomment to clear DB first

        console.log('👥 Inserting 10 new users...');
        await User.insertMany(sampleUsers);

        console.log('✅ Successfully populated database with 10 users!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error populating database:', error);
        process.exit(1);
    }
};

populateUsers();
