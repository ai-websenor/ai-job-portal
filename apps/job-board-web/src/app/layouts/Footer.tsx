"use client";
import Link from "next/link";
import { footerLinks } from "../config/data";
import Image from "next/image";
import { Divider } from "@heroui/react";
import { FaFacebookF, FaTwitter, FaInstagram, FaGithub } from "react-icons/fa";
import routePaths from "../config/routePaths";
import ENDPOINTS from "../api/endpoints";
import http from "../api/http";
import { useState, useEffect } from "react";

const Footer = () => {
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await http.get(ENDPOINTS.CMS.GET_PAGES) as any;
        if (res?.data) {
          setPages(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      }
    };
    fetchPages();
  }, []);

  const dynamicSupportLinks = [
    {
      title: "Contact Us",
      href: routePaths.contactUs,
    },
    ...pages.map((page: any) => ({
      title: page.title,
      href: routePaths.cms(page.slug),
    })),
  ];

  const updatedFooterLinks = footerLinks.map((item) => {
    if (item.title === 'Support') {
      return {
        ...item,
        childs: dynamicSupportLinks
      };
    }
    return item;
  });

  return (
    <footer className="bg-primary pt-16 pb-8 px-5 relative overflow-hidden">
      {/* Background Airplane Image */}
      <div className="2xl:block hidden absolute right-20 bottom-24 opacity-50 pointer-events-none">
        <Image
          src="/assets/images/footer-bg.png"
          alt="Background Decoration"
          width={184}
          height={152}
          className="object-contain"
        />
      </div>

      <div className="container mx-auto">
        <div className="grid gap-10 sm:grid-cols-4 mb-16">
          {updatedFooterLinks.map((item) => (
            <div key={item.title}>
              <h4 className="text-white font-semibold mb-4">{item.title}</h4>
              <div className="flex flex-col gap-3">
                {item.childs.map((child) => (
                  <Link
                    href={child.href || routePaths.home}
                    key={child.title}
                    className="text-white/70 text-sm hover:text-white transition-all"
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Divider className="bg-white/20 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white font-bold text-xl tracking-wider">
            FIND JOBS
          </div>
          <p className="text-white/60 text-sm">
            © Copyright 2024, All Rights Reserved by Findjobs
          </p>
          <div className="flex gap-4">
            {[FaFacebookF, FaTwitter, FaInstagram, FaGithub].map(
              (Icon, index) => (
                <Link
                  key={index}
                  href="#"
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                  <Icon size={14} />
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
