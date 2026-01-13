import { Card } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export const ContactUs = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-primary">Contact Us</h2>
        <p className="text-muted-foreground">We're here to help! Reach out to us anytime.</p>
      </div>

      <Card className="p-6 space-y-6">
        {/* CEO Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
            <img
              src="/ceo.jpg"
              alt="CEO"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">MOHAMMED SAMEER</h3>
            <p className="text-sm text-muted-foreground">Leading BookNex with passion</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-lg">Get In Touch</h3>

          <a
            href="mailto:sameersam37376@gmail.com"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">sameersam37376@gmail.com</p>
            </div>
          </a>

          <a
            href="tel:8431743739"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="p-2 rounded-full bg-secondary/10">
              <Phone className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">8431743739</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <div className="p-2 rounded-full bg-accent/50">
              <MapPin className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Office</p>
              <p className="text-sm text-muted-foreground">BookNex Headquarters</p>
            </div>
          </div>
        </div>

        {/* Happy Message */}
        <div className="pt-4 border-t text-center">
          <p className="text-lg font-medium text-primary mb-2">
            Thank you for choosing BookNex! 🎉
          </p>
          <p className="text-sm text-muted-foreground">
            We're committed to making your booking experience seamless and enjoyable.
            Your satisfaction is our top priority!
          </p>
        </div>
      </Card>
    </div>
  );
};
