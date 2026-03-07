'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import withAuth from '@/app/hoc/withAuth';
import { ITemplateBuilderData, ITemplateStructuredData } from '@/app/types/types';
import { Button, Tab, Tabs } from '@heroui/react';
import { use, useEffect, useState } from 'react';
import EditDetails from './tabs/EditDetails';
import Preview from './tabs/Preview';
import { AiOutlineFilePdf } from 'react-icons/ai';
import useUserStore from '@/app/store/useUserStore';

import { generateFullHtml } from '@/app/utils/resume-renderer';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState<ITemplateStructuredData | null>(null);
  const [templateData, setTemplateData] = useState<ITemplateBuilderData | null>(null);

  const getTemplateData = async () => {
    try {
      setLoading(true);
      const response = await http.post(ENDPOINTS.TEMPLATES.TEMPLATE_DATE, {
        templateId: id,
      });
      if (response?.data) {
        setTemplateData(response?.data);
        setForm(response?.data?.structuredData);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTemplateData();
  }, []);

  const handleDownload = async () => {
    if (!form || !templateData) return;

    const fullHtml = generateFullHtml(
      templateData.template.templateHtml || '',
      templateData.template.templateCss || '',
      form,
      templateData.renderConfig,
    );

    const payload = {
      html: templateData?.renderedHtml,
      fullHtml: fullHtml,
      css: '',
      templateId: id,
      styleConfig: templateData?.renderConfig,
      fileName: `${user?.firstName}_Resume`,
    };

    try {
      setDownloading(true);
      const response = await http.post(ENDPOINTS.TEMPLATES.GENERATE_PDF, payload);
      if (response?.data?.downloadUrl) {
        console.log(response);
        window.open(response?.data?.downloadUrl, '_blank');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <title>Template Builder</title>
      {loading ? (
        <LoadingProgress />
      ) : templateData ? (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <div className="flex sm:flex-row flex-col gap-5 justify-between">
              <h1 className="text-2xl font-bold text-foreground">Template Builder</h1>
              <Button
                size="sm"
                color="success"
                className="text-white"
                onPress={handleDownload}
                isLoading={downloading}
                startContent={<AiOutlineFilePdf size={17} />}
              >
                Download PDF
              </Button>
            </div>
          </div>

          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key.toString())}
            color="primary"
            variant="underlined"
            className="mb-5"
          >
            {tabs.map((tab) => {
              return <Tab key={tab.key} className="font-medium" title={tab.title} />;
            })}
          </Tabs>

          {activeTab === '1' && <EditDetails form={form} setForm={setForm} />}

          {activeTab === '2' && (
            <Preview
              data={form!}
              templateHtml={templateData?.template?.templateHtml}
              templateCss={templateData?.template?.templateCss}
              renderConfig={templateData?.renderConfig}
            />
          )}
        </div>
      ) : (
        <NoDataFound />
      )}
    </>
  );
};

export default withAuth(page);

const tabs = [
  {
    key: '1',
    title: 'Edit Details',
  },
  {
    key: '2',
    title: 'Preview',
  },
];
