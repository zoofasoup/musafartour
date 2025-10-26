import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/PackageCard";
import { FeatureCard } from "@/components/FeatureCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, MapPin, Hotel, MessageCircle, FileCheck, Users, Heart } from "lucide-react";
import heroImage from "@/assets/hero-umrah.jpg";
import makkahImage from "@/assets/makkah.jpg";
import madinahImage from "@/assets/madinah.jpg";
import musafarLogo from "@/assets/musafar-logo.svg";

const Index = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");

  const packages = [
    {
      image: makkahImage,
      title: "Comfort Umrah + Thaif, July 2025",
      price: "Rp 28,500,000",
      duration: "12 Days",
      airline: "Garuda Indonesia",
      hotelClass: "4-Star (Near Haram)",
      departureCity: "Jakarta",
      category: "Comfort",
    },
    {
      image: madinahImage,
      title: "Budget Umrah Package, August 2025",
      price: "Rp 22,000,000",
      duration: "9 Days",
      airline: "Saudia Airlines",
      hotelClass: "3-Star",
      departureCity: "Surabaya",
      category: "Budget",
    },
    {
      image: makkahImage,
      title: "Five-Star Premium Umrah, September 2025",
      price: "Rp 45,000,000",
      duration: "14 Days",
      airline: "Emirates",
      hotelClass: "5-Star (Haram View)",
      departureCity: "Jakarta",
      category: "Five-Star",
    },
    {
      image: madinahImage,
      title: "Comfort Umrah Direct Flight, July 2025",
      price: "Rp 32,000,000",
      duration: "10 Days",
      airline: "Qatar Airways",
      hotelClass: "4-Star",
      departureCity: "Jakarta",
      category: "Comfort",
    },
    {
      image: makkahImage,
      title: "Budget Umrah Transit Package, June 2025",
      price: "Rp 19,500,000",
      duration: "9 Days",
      airline: "Garuda Indonesia",
      hotelClass: "3-Star",
      departureCity: "Bandung",
      category: "Budget",
    },
    {
      image: madinahImage,
      title: "Five-Star Luxury Umrah, October 2025",
      price: "Rp 52,000,000",
      duration: "15 Days",
      airline: "Emirates",
      hotelClass: "5-Star (Premium)",
      departureCity: "Jakarta",
      category: "Five-Star",
    },
  ];

  const features = [
    {
      icon: Plane,
      title: "All-Inclusive Flights & Visa",
      description: "Complete travel arrangements with trusted airlines and hassle-free visa processing.",
    },
    {
      icon: MapPin,
      title: "Guided Worship & Mentorship",
      description: "Experienced Musamin guides to support your spiritual journey every step of the way.",
    },
    {
      icon: Hotel,
      title: "Hotels Close to the Haram",
      description: "Comfortable accommodations within walking distance to Masjid al-Haram and Masjid Nabawi.",
    },
    {
      icon: Heart,
      title: "Friendly Personal Assistance",
      description: "Our caring team is always ready to help you with warmth and dedication.",
    },
  ];

  const testimonials = [
    {
      name: "Siti Nurhaliza",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
      text: "Alhamdulillah, our Umrah with Musafar Tour was truly blessed. The team was so caring and professional. Highly recommended!",
      location: "Jakarta",
    },
    {
      name: "Ahmad Fauzi",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      text: "Everything was perfectly organized. The hotel was close to Haram and the Musamin guide was very helpful. Best decision ever.",
      location: "Bandung",
    },
    {
      name: "Fatimah Rahman",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      text: "My family and I felt at home throughout the journey. Musafar Tour made our spiritual journey unforgettable. Thank you!",
      location: "Surabaya",
    },
  ];

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/6281234567890?text=Hi%20Musamin,%20I'm%20interested%20in%20learning%20more%20about%20Umrah%20packages", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <img src={musafarLogo} alt="Musafar Tour" className="h-16 mx-auto mb-8 opacity-90" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
            Find the Perfect Umrah Package for Your Journey
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            Musafar Tour offers thoughtfully designed Umrah experiences — from budget to five-star, all guided with care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8"
              onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Browse All Packages
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white text-white hover:bg-white hover:text-foreground font-semibold text-lg px-8 backdrop-blur-sm"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat with Musamin 🤍
            </Button>
          </div>
        </div>
      </section>

      {/* Filter & Package Catalog */}
      <section id="packages" className="py-16 container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-2 text-foreground">Our Umrah Packages</h2>
          <p className="text-center text-muted-foreground">Find the journey that speaks to your heart</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-card p-6 rounded-lg shadow-md mb-12 sticky top-4 z-40 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="comfort">Comfort</SelectItem>
                <SelectItem value="five-star">Five-Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={airline} onValueChange={setAirline}>
              <SelectTrigger>
                <SelectValue placeholder="Airline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Airlines</SelectItem>
                <SelectItem value="garuda">Garuda Indonesia</SelectItem>
                <SelectItem value="saudia">Saudia Airlines</SelectItem>
                <SelectItem value="qatar">Qatar Airways</SelectItem>
                <SelectItem value="emirates">Emirates</SelectItem>
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="june">June 2025</SelectItem>
                <SelectItem value="july">July 2025</SelectItem>
                <SelectItem value="august">August 2025</SelectItem>
                <SelectItem value="september">September 2025</SelectItem>
                <SelectItem value="october">October 2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger>
                <SelectValue placeholder="Flight Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="transit">Transit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary hover:bg-primary/5"
            onClick={() => {
              setCategory("all");
              setAirline("all");
              setMonth("all");
              setFlightType("all");
            }}
          >
            Reset Filters
          </Button>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <PackageCard key={index} {...pkg} />
          ))}
        </div>
      </section>

      {/* Why Choose Musafar */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-foreground">Why Choose Musafar Tour</h2>
            <p className="text-muted-foreground">We accompany you with heart and professionalism</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-foreground">Real Stories from Our Happy Musafriends</h2>
            <p className="text-muted-foreground">Hear from those who've walked this blessed path with us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Not Sure Which Umrah Package Fits You?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Our Musamin team is ready to help you find the perfect journey for your needs and budget.
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Consult Now via WhatsApp
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src={musafarLogo} alt="Musafar Tour" className="h-12 mb-4" />
              <p className="text-sm opacity-80">
                Every step toward the Holy Land begins with pure intention — and sincere guidance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact Us</h3>
              <p className="text-sm opacity-80 mb-2">
                Jl. Kebon Jeruk Raya No. 123<br />
                Jakarta Barat 11530
              </p>
              <p className="text-sm opacity-80">
                PPIU License: 123/2024/PPIU<br />
                Phone: +62 812 3456 7890
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Follow Us</h3>
              <div className="flex gap-4 text-sm">
                <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Instagram</a>
                <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Facebook</a>
                <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">YouTube</a>
              </div>
            </div>
          </div>
          <div className="border-t border-background/20 pt-6 text-center text-sm opacity-80">
            © 2025 Musafar Tour. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
