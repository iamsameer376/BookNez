import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Upload, X, Loader2 } from 'lucide-react';
import { generateTimeOptions } from '@/utils/timeOptions';
import { TablesInsert } from '@/integrations/supabase/types';
import { LocationPicker } from '@/components/LocationPicker';

const AddVenue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    category: '',
    photos: [] as string[],
    pricing: '',
    amenities: [] as string[],
    acceptedTerms: false,
    latitude: '',
    longitude: '',
    openingTime: '06:00 AM',
    closingTime: '11:00 PM',
    sports: [] as string[],
  });

  const [customSport, setCustomSport] = useState("");

  const amenitiesList = [
    'Parking', 'WiFi', 'Air Conditioning', 'Locker Room',
    'Shower', 'Equipment', 'Cafeteria', 'First Aid'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [submissionError, setSubmissionError] = useState<string | null>(null);



  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast({
        title: 'Too many photos',
        description: 'Maximum 5 photos allowed',
        variant: 'destructive',
        duration: 1000,
      });
      return;
    }

    // Validate file sizes and types
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      if (!isImage) toast({ title: "Invalid file type", description: `${file.name} is not an image`, variant: "destructive" });
      if (!isValidSize) toast({ title: "File too large", description: `${file.name} exceeds 5MB`, variant: "destructive" });
      return isImage && isValidSize;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (formData.category === 'turf' && formData.sports.length === 0) return false;
        return formData.name && formData.description && formData.address && formData.category;
      case 2:
        return selectedImages.length >= 1;
      case 3:
        return formData.pricing && parseFloat(formData.pricing) > 0;
      case 4:
        return formData.amenities.length > 0;
      case 5:
        return formData.acceptedTerms;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    } else {
      toast({
        title: 'Incomplete information',
        description: 'Please fill all required fields',
        variant: 'destructive',
        duration: 1000,
      });
    }
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];
    let lastError: any = null;

    if (!user?.id) throw new Error("User ID not found. Please log in again.");

    for (const file of selectedImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`; // Ensure user.id is string



      const { error: uploadError } = await supabase.storage
        .from('venue_photos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        lastError = uploadError;
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('venue_photos')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    // If we had images but none uploaded, throw the actual underlying error
    if (uploadedUrls.length === 0 && selectedImages.length > 0) {
      throw new Error(`Upload failed: ${lastError?.message || 'Unknown error code'}`);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast({
        title: 'Please accept terms',
        variant: 'destructive',
        duration: 1000,
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Images
      const photoUrls = await uploadImages();

      if (photoUrls.length === 0 && selectedImages.length > 0) {
        throw new Error("Failed to upload images. Please try again.");
      }

      // 2. Insert Venue Data
      const venueData: TablesInsert<'venues'> = {
        owner_id: user?.id as string,
        name: formData.name,
        description: formData.description,
        address: formData.address,
        category: formData.category,
        pricing: parseFloat(formData.pricing),
        amenities: formData.amenities,
        sports: formData.sports,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        opening_time: formData.openingTime,
        closing_time: formData.closingTime,
        photos: photoUrls,
        is_active: true
      };

      const { error: venueError } = await supabase
        .from('venues')
        .insert(venueData)
        .select()
        .single();

      if (venueError) throw venueError;

      toast({
        title: 'Venue created successfully!',
        description: 'Your venue is now live',
        duration: 1000,
      });

      navigate('/owner/venues');
    } catch (error: any) {
      console.error('Create venue error:', error);
      setSubmissionError(error.message || 'Failed to create venue');
      window.scrollTo(0, 0); // Scroll to top to see error
      toast({
        title: 'Error creating venue',
        description: error.message || 'Failed to create venue',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/owner')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Add New Venue - Step {step} of 5</CardTitle>
            {submissionError && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2 mt-2">
                <X className="h-5 w-5 flex-shrink-0" />
                <span className="font-bold">{submissionError}</span>
              </div>
            )}

          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Venue Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter venue name"
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleInputChange('category', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turf">TURF</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sports Selection (Only for Turf) */}
                {formData.category === 'turf' && (
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-semibold">Available Sports / Games *</Label>
                    <p className="text-sm text-muted-foreground">Select the sports available at your turf.</p>

                    <div className="flex flex-wrap gap-2">
                      {['Cricket', 'Football', 'Tennis', 'Badminton', 'Pickleball'].map((sport) => (
                        <div
                          key={sport}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              sports: prev.sports.includes(sport)
                                ? prev.sports.filter(s => s !== sport)
                                : [...prev.sports, sport]
                            }));
                          }}
                          className={`
                            cursor-pointer px-4 py-2 rounded-full border transition-all select-none text-sm
                            ${formData.sports.includes(sport)
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                              : 'bg-background hover:bg-secondary/50 border-input'}
                          `}
                        >
                          {sport}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 items-center max-w-sm">
                      <Input
                        placeholder="Add other sport..."
                        value={customSport}
                        onChange={(e) => setCustomSport(e.target.value)}
                        className="h-9"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customSport.trim()) {
                              setFormData(prev => ({
                                ...prev,
                                sports: [...prev.sports, customSport.trim()]
                              }));
                              setCustomSport('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (customSport.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              sports: [...prev.sports, customSport.trim()]
                            }));
                            setCustomSport('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {formData.sports.filter(s => !['Cricket', 'Football', 'Tennis', 'Badminton', 'Pickleball'].includes(s)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.sports.filter(s => !['Cricket', 'Football', 'Tennis', 'Badminton', 'Pickleball'].includes(s)).map(s => (
                          <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 flex gap-1 items-center">
                            {s}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => setFormData(prev => ({ ...prev, sports: prev.sports.filter(sport => sport !== s) }))}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your venue..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Location & Address *</Label>
                  <div className="mb-4">
                    <LocationPicker
                      onLocationSelect={(loc) => {
                        setFormData(prev => ({
                          ...prev,
                          address: loc.address,
                          latitude: loc.lat.toString(),
                          longitude: loc.lng.toString()
                        }));
                      }}
                      initialLocation={
                        formData.latitude && formData.longitude
                          ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                          : null
                      }
                    />
                  </div>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Full address (Street, Area, City)..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can finetune the address after selecting from map.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Photos */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Upload Photos (Min 1, Max 5) *</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    High quality images help attract more customers. Max 5MB per image.
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedImages.length} photo(s) selected
                    </span>
                  </div>
                </div>
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedImages.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group shadow-sm bg-secondary/10">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => handleRemovePhoto(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Base Pricing (per hour) *</Label>
                  <Input
                    type="number"
                    value={formData.pricing}
                    onChange={(e) => handleInputChange('pricing', e.target.value)}
                    placeholder="1000"
                    min="0"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter base price in INR.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Opening Time *</Label>
                    <select
                      value={formData.openingTime}
                      onChange={(e) => handleInputChange('openingTime', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Closing Time *</Label>
                    <select
                      value={formData.closingTime}
                      onChange={(e) => handleInputChange('closingTime', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Amenities */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Amenities *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {amenitiesList.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={formData.amenities.includes(amenity)}
                          onCheckedChange={() => handleAmenityToggle(amenity)}
                        />
                        <label htmlFor={amenity} className="text-sm cursor-pointer select-none">
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Terms */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-card/50">
                  <h3 className="font-semibold mb-2">Terms and Conditions</h3>
                  <p className="text-sm text-muted-foreground">
                    By listing your venue on BookNex, you agree to:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                    <li>Provide accurate information about your venue</li>
                    <li>Honor all confirmed bookings</li>
                    <li>Maintain quality standards</li>
                    <li>Pay platform commission of 10% on each booking</li>
                    <li>Follow cancellation policies</li>
                  </ul>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptedTerms}
                    onCheckedChange={(checked) => handleInputChange('acceptedTerms', checked)}
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    I accept the terms and conditions *
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => setStep(prev => prev - 1)}
                disabled={step === 1 || loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {step < 5 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="min-w-[140px]">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Create Venue'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddVenue;
