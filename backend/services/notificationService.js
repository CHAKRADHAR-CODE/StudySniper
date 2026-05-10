import cron from 'node-cron';
import { db } from '../firebase.js';
import { mailService } from './mailService.js';

/**
 * StudySniper Neural Notification System
 * Handles daily study reminders and progress alerts.
 */

export const initNotifications = () => {
  console.log('🚀 Neural Notification System Initialized');

  // 1. Morning Briefing: 12:00 AM Daily
  cron.schedule('0 0 * * *', async () => {
    console.log('🧠 Running Morning Briefing...');
    try {
      const usersSnap = await db.collection('users').get();
      
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const profile = await db.collection('users').doc(userId).collection('profile').doc('info').get();
        const plan = await db.collection('users').doc(userId).collection('studyPlan').doc('current').get();

        if (plan.exists && profile.exists) {
          const email = profile.data().email || userDoc.id;
          const todayTasks = plan.data().schedule?.[0]?.tasks || [];
          
          if (todayTasks.length > 0) {
            await mailService.sendDailyBriefing(email, todayTasks);
          }
        }
      }
    } catch (error) {
      console.error('❌ Morning Briefing Failed:', error.message);
    }
  });

  // 2. Nightly Progress Reminder: 10:00 PM Daily
  cron.schedule('0 22 * * *', async () => {
    console.log('🌙 Running Nightly Progress Reminder...');
    try {
      const usersSnap = await db.collection('users').get();
      
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const profile = await db.collection('users').doc(userId).collection('profile').doc('info').get();
        const progress = await db.collection('users').doc(userId).collection('progress').doc('current').get();

        if (profile.exists && progress.exists) {
          const email = profile.data().email;
          const completedCount = progress.data().completedTasks?.length || 0;
          await mailService.sendNightlyReminder(email, completedCount);
        }
      }
    } catch (error) {
      console.error('❌ Nightly Reminder Failed:', error.message);
    }
  });

  // 3. Neural Cleanup: 12:00 AM Daily
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running Neural Cleanup...');
    try {
      const now = Date.now();
      const usersSnap = await db.collection('users').get();
      
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        
        // A. Delete Cheat Sheets > 24h old
        const sheetsRef = db.collection('users').doc(userId).collection('cheatsheets');
        const sheetsSnap = await sheetsRef.get();
        for (const sheet of sheetsSnap.docs) {
          const createdAt = sheet.data().createdAt?.toDate()?.getTime() || now;
          if (now - createdAt > 24 * 60 * 60 * 1000) {
            await sheet.ref.delete();
          }
        }

        // B. Delete Study Plans > 7 days old
        const planRef = db.collection('users').doc(userId).collection('studyPlan').doc('current');
        const plan = await planRef.get();
        if (plan.exists) {
          const updatedAt = plan.data().updatedAt?.toDate()?.getTime() || now;
          if (now - updatedAt > 7 * 24 * 60 * 60 * 1000) {
            await planRef.delete();
          }
        }

        // C. Delete Exam Prep Plan if Exam Date has passed
        const onboardingRef = db.collection('users').doc(userId).collection('profile').doc('onboarding');
        const onboarding = await onboardingRef.get();
        const prepRef = db.collection('users').doc(userId).collection('examPrepPlan').doc('current');
        
        if (onboarding.exists) {
          const examDate = new Date(onboarding.data().examDate).getTime();
          if (now >= examDate) {
            await prepRef.delete();
          }
        }
      }
      console.log('✅ Neural Cleanup Complete');
    } catch (error) {
      console.error('❌ Cleanup Failed:', error.message);
    }
  });
};
