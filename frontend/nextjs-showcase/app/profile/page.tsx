'use client';

import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function Profile() {
  const { user } = useAuth();
  const [age, setAge] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user) {
      // Load user profile data from new collection
      const loadProfile = async () => {
        const profileRef = doc(db, 'userProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.dateOfBirth) {
            setSelectedDate(data.dateOfBirth.toDate());
            setAge(formatDate(data.dateOfBirth.toDate()));
          }
        }
      };
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (!showDatePicker) return;

    const earth = document.getElementById("earth") as HTMLImageElement;
    const dateDisplay = document.getElementById("dateDisplay") as HTMLDivElement;
    const datePicker = document.getElementById("datePicker") as HTMLDivElement;
    const ellipse = document.getElementById("ellipse") as SVGEllipseElement;

    if (!earth || !dateDisplay || !datePicker || !ellipse) return;

    let isPressing = false;

    const earthSize = 15;
    const horizontalRadius = 150;
    const verticalRadius = 73;
    const horizontalMargin = 25;
    const verticalMargin = 10;

    let today = new Date();
    let year = selectedDate?.getFullYear() || today.getFullYear();
    let start = new Date(year, 0, 0);
    let diff = (selectedDate || today).getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    let dayNumber = Math.floor(diff / oneDay);
    let date = dateFromDay(dayNumber);
    dateDisplay.innerHTML = formatDate(date);

    let angle = 2*Math.asin(((dayNumber-1)/(182.5 + (isLeapyear()?0.5:0)))-1);
    let previousAngle = angle;
    let x = horizontalRadius*Math.cos(angle);
    let y = verticalRadius*Math.sin(angle);

    earth.setAttribute("x", String(horizontalRadius + x - earthSize/2 + horizontalMargin));
    earth.setAttribute("y", String(verticalRadius - y - earthSize/2 + verticalMargin));

    function mousedown(e: MouseEvent | TouchEvent) {
      isPressing = true;
      e.preventDefault();
    }

    function mousemove(e: MouseEvent | TouchEvent) {
      if(!isPressing) return;

      const { clientX, clientY } = (e as TouchEvent).touches != null ? (e as TouchEvent).touches[0] : e as MouseEvent;

      const rect = ellipse.getBoundingClientRect();
      const ellipseCenterX = rect.x + rect.width/2;
      const ellipseCenterY = rect.y + rect.height/2;
      angle = Math.atan2(ellipseCenterY - clientY, clientX - ellipseCenterX);

      const angleDiff = angle - previousAngle;

      if (angleDiff > Math.PI) {
        year--;
      } else if (angleDiff < -Math.PI) {
        year++;
      }

      previousAngle = angle;

      let x = horizontalRadius*Math.cos(angle);
      let y = verticalRadius*Math.sin(angle);

      earth.setAttribute("x", String(horizontalRadius + x - earthSize/2 + horizontalMargin));
      earth.setAttribute("y", String(verticalRadius - y - earthSize/2 + verticalMargin));

      dayNumber = ((182.5 + (isLeapyear()?0.5:0))*(Math.sin((angle)/2) + 1) + 1);

      date = dateFromDay(dayNumber);

      if(date.getTime() > today.getTime() || year < 1950){
        dateDisplay.classList.add("future");
        if(year < 1950){
          year = 1950;
          dateDisplay.innerHTML = "Can't go before 1950!";
        }else{
          dateDisplay.innerHTML = "No time travelers!";
        }
      }else{
        dateDisplay.classList.remove("future");
        dateDisplay.innerHTML = formatDate(date);
        setSelectedDate(date);
        setAge(formatDate(date));
      }
    }

    function dateFromDay(day: number){
      const date = new Date(year, 0);
      return new Date(date.setDate(day));
    }

    function mouseup(e: MouseEvent | TouchEvent) {
      isPressing = false;
    }

    function isLeapyear(){
      return (year % 100 === 0) ? (year % 400 === 0) : (year % 4 === 0);
    }

    earth.addEventListener("mousedown", mousedown);
    earth.addEventListener("touchstart", mousedown);
    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", mousemove);
    window.addEventListener("mouseup", mouseup);
    window.addEventListener("touchend", mouseup);

    return () => {
      earth.removeEventListener("mousedown", mousedown);
      earth.removeEventListener("touchstart", mousedown);
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("touchmove", mousemove);
      window.removeEventListener("mouseup", mouseup);
      window.removeEventListener("touchend", mouseup);
    };
  }, [showDatePicker]);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const saveProfile = async () => {
    if (!user || !selectedDate) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        dateOfBirth: selectedDate,
        updatedAt: new Date()
      }, { merge: true });
      setShowDatePicker(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 shadow-md">
          ← Back
        </Link>
        <div className="mt-6 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile</h1>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">UID:</span>
                <p className="text-gray-900 font-medium mt-1">{user.uid}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Email:</span>
                <p className="text-gray-900 font-medium mt-1">{user.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Date of Birth:</span>
                <div className="mt-2">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 shadow-md"
                  >
                    {age || 'Select Date of Birth'}
                  </button>
                </div>
                {showDatePicker && (
                  <div className="mt-4 relative">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="relative w-full mb-4">
                        <div id="dateDisplay" className="w-full bg-white text-gray-800 rounded-lg p-3 text-center font-semibold"></div>
                        <div id="datePicker" className="w-full bg-black rounded-3xl p-4 mt-2" style={{cursor: 'grab'}}>
                          <svg viewBox="0 0 350 166" className="w-full">
                            <ellipse id="ellipse" cx="175" cy="83" rx="150" ry="73"
                            style={{fillOpacity: 0, stroke: 'yellow', strokeWidth: 0.5}} />
                            <image id="earth" height="15" width="15" href="/earth.png" style={{cursor: 'grab'}}></image>
                            <image id="sun" x="105" y="68" height="30" width="30" href="/sun.png"></image>
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={saveProfile}
                        disabled={saving || !selectedDate}
                        className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 shadow-md"
                      >
                        {saving ? 'Saving...' : 'Save Date of Birth'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-900 font-medium">You are not signed in.</p>
          )}
        </div>
      </div>

      <style jsx global>{`
        .future {
          color: red !important;
          font-size: 0.7rem;
        }
        #earth {
          cursor: grab;
        }
        #earth:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}

