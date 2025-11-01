"use client";

import { useState, useCallback } from "react";
import type { POICategory } from "@/components/leaflet-map";

interface PlaceDetailModalProps {
  osmId: string;
  placeName: string;
  category: POICategory;
  lat: number;
  lng: number;
  onClose: () => void;
  onPhotoUpload?: (url: string, caption: string, visibility: string) => void;
}

export default function PlaceDetailModal({
  osmId,
  placeName,
  category,
  lat,
  lng,
  onClose,
  onPhotoUpload,
}: PlaceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "photos" | "review">("info");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [photos, setPhotos] = useState<
    { id: string; url: string; caption: string; author: string; visibility: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setUploading(true);
      try {
        // Simulate file upload (in real app, upload to cloud storage)
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = URL.createObjectURL(file);
          const newPhoto = {
            id: `photo-${Date.now()}-${i}`,
            url,
            caption: "",
            author: "You",
            visibility: "PUBLIC",
          };
          setPhotos((prev) => [newPhoto, ...prev]);
        }
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleSubmitReview = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Submit review to API
      const response = await fetch("/api/places/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osmId,
          placeName,
          category,
          lat,
          lng,
          rating,
          text: reviewText,
          visited: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      const review = await response.json();

      // Upload photos
      for (const photo of photos) {
        if (photo.url.startsWith("blob:")) {
          // This is a local photo, we'd need to upload it to cloud storage first
          // For now, we'll skip the photo submission
          console.log("Photo upload to cloud storage would happen here");
        }
      }

      alert("Review submitted successfully!");
      setReviewText("");
      setRating(5);
      setPhotos([]);
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }, [osmId, placeName, category, lat, lng, rating, reviewText, photos]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{placeName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {category} • {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 bg-white px-6">
          {(["info", "photos", "review"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "info" && "ℹ️ Info"}
              {tab === "photos" && "📷 Photos"}
              {tab === "review" && "⭐ Review"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                <p className="text-sm text-gray-700">
                  📍 Latitude: {lat.toFixed(6)}
                </p>
                <p className="text-sm text-gray-700">
                  📍 Longitude: {lng.toFixed(6)}
                </p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  → Open in Maps
                </button>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-2">Quick Facts</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Category: {category}</li>
                  <li>✓ OSM ID: {osmId}</li>
                  <li>✓ Type: Point of Interest</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "photos" && (
            <div className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer"
                >
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-700 font-medium">
                    {uploading ? "Uploading..." : "Click to upload photos"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </label>
              </div>

              {/* Photo Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={photo.url}
                        alt={photo.caption || "Photo"}
                        className="w-full h-40 object-cover"
                      />
                      <div className="p-3 bg-white">
                        <input
                          type="text"
                          placeholder="Add caption..."
                          defaultValue={photo.caption}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
                        />
                        <select className="w-full text-xs border border-gray-300 rounded px-2 py-1">
                          <option value="PUBLIC">Public</option>
                          <option value="FRIENDS">Friends Only</option>
                          <option value="PRIVATE">Private</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && !uploading && (
                <p className="text-center text-gray-500 text-sm py-8">
                  No photos yet. Upload one to get started!
                </p>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Rate this place
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-4xl transition-transform ${
                        star <= rating ? "text-yellow-400" : "text-gray-300"
                      } hover:scale-110`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Great"}
                  {rating === 5 && "Excellent"}
                </p>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience at this place..."
                  className="w-full h-32 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
