import Link from "next/link";
import { BookOpen, Github, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <BookOpen className="h-6 w-6 text-primary-500" />
              <span>TutorNow</span>
            </Link>
            <p className="text-sm">
              Connecting eager students with professional, verified tutors for instant, personalized, on-demand learning sessions.
            </p>
            <div className="flex gap-4 mt-2">
              <a href="#" className="hover:text-white transition"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white transition"><Github className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white transition"><Linkedin className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tutors" className="hover:text-white transition">Browse Tutors</Link></li>
              <li><Link href="/register?role=Tutor" className="hover:text-white transition">Become a Tutor</Link></li>
              <li><Link href="/about" className="hover:text-white transition">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-white transition">Frequently Asked FAQs</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Support</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2 items-center">
                <Mail className="h-4 w-4 text-primary-500" />
                <span>support@tutornow.com</span>
              </li>
              <li className="flex gap-2 items-center">
                <Phone className="h-4 w-4 text-primary-500" />
                <span>+1 (800) 555-TUTOR</span>
              </li>
              <li className="flex gap-2 items-center">
                <MapPin className="h-4 w-4 text-primary-500" />
                <span>100 Education Way, Boston, MA</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} TutorNow Inc. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-white transition">Security</a>
            <a href="#" className="hover:text-white transition">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
